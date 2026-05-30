"""The signal judge. One Groq call per article scores persona-INDEPENDENT
substance axes AND a relevance + 'so what' angle for every enabled persona.

Resumable: only scores articles missing a substance score. Persona signal
(substance · relevance/10 · recency) is precomputed so feeds rank instantly.
"""
import json
import math
import time
from dataclasses import dataclass

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings
from app.db import get_connection
from app.personas import Persona, list_personas

# Groq rate-limits bursts. Pace between calls and back off hard on 429.
SCORE_DELAY = 1.2  # seconds between scoring calls

# Persona-independent rubric. Concrete, low-temperature, JSON out.
RUBRIC = (
    "You are a ruthless analyst scoring an item from the AI beat. Score these "
    "0-10 (10 = exceptional):\n"
    "- novelty: is this genuinely new, or a rehash/restatement?\n"
    "- evidence: concrete proof — a released artifact, benchmark number, named "
    "deployment, real figures — vs claims and vibes?\n"
    "- specificity: precise and substantive vs vague and general?\n"
    "- hype_markers: superlatives, breathlessness, marketing language with no "
    "proof (10 = pure hype, 0 = sober).\n"
    "Then, for EACH persona given, score relevance on this STRICT scale — most "
    "items are NOT relevant to a given persona, so be harsh and use the full range:\n"
    "  0-2: they would skip this; not their world.\n"
    "  3-5: tangential; mild interest, no action.\n"
    "  6-7: would inform a decision they actually make.\n"
    "  8-10: must-know; directly changes a near-term decision (their decision_lens).\n"
    "Do NOT inflate. 'Could eventually reduce costs' is a 3, not a 7. Reserve 8-10 "
    "for items that pass their decision_lens directly. Also give:\n"
    "- angle: ONE concrete sentence — the 'so what for you'. If irrelevant, say so plainly.\n"
    "Return ONLY JSON."
)


@dataclass
class Score:
    novelty: float
    evidence: float
    specificity: float
    hype_markers: float
    personas: dict  # key -> {"relevance": float, "angle": str}

    @property
    def substance(self) -> float:
        # Substance rewards novelty/evidence/specificity, penalizes hype.
        base = 0.4 * self.evidence + 0.35 * self.novelty + 0.25 * self.specificity
        return max(0.0, base - 0.3 * self.hype_markers)


def _persona_block(personas: list[Persona]) -> str:
    out = []
    for p in personas:
        out.append(
            f'- key "{p.key}" ({p.name}): identity={p.identity} '
            f'cares_about={p.cares_about} noise={p.noise} '
            f'decision_lens="{p.decision_lens}"'
        )
    return "\n".join(out)


def _schema_hint(personas: list[Persona]) -> str:
    pj = ", ".join(
        f'"{p.key}": {{"relevance": 0-10, "angle": "..."}}' for p in personas
    )
    return ('{"novelty":0-10,"evidence":0-10,"specificity":0-10,'
            '"hype_markers":0-10,"personas":{' + pj + "}}")


def _is_rate_limit(exc: Exception) -> bool:
    return exc.__class__.__name__ in ("RateLimitError", "APIStatusError") or \
        "429" in str(exc) or "rate" in str(exc).lower()


@retry(
    retry=retry_if_exception_type(Exception),
    wait=wait_exponential(multiplier=4, min=4, max=60),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _judge(title: str, summary: str, personas: list[Persona]) -> Score:
    from groq import Groq

    cfg = get_settings()
    client = Groq(api_key=cfg.groq_api_key)
    prompt = (
        f"{RUBRIC}\n\nPersonas:\n{_persona_block(personas)}\n\n"
        f"Return exactly this shape:\n{_schema_hint(personas)}\n\n"
        f"ITEM:\nTitle: {title}\nText: {summary or '(no summary)'}"
    )
    resp = client.chat.completions.create(
        model=cfg.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    data = json.loads(resp.choices[0].message.content)
    return Score(
        novelty=float(data.get("novelty", 0)),
        evidence=float(data.get("evidence", 0)),
        specificity=float(data.get("specificity", 0)),
        hype_markers=float(data.get("hype_markers", 0)),
        personas=data.get("personas", {}),
    )


def _hype_gap(engagement: float, substance: float, max_eng: float) -> float | None:
    # Only meaningful where engagement exists (HN/Reddit). For papers/blogs with no
    # engagement signal, hype_gap is undefined — don't fake a 'buried' verdict.
    if not engagement or engagement <= 0:
        return None
    norm = 10.0 * math.log1p(engagement) / math.log1p(max(1.0, max_eng))
    return round(norm - substance, 3)


def persona_signal(substance: float, relevance: float, recency: float) -> float:
    # Relevance LEADS (it's a persona feed). Substance is a quality DEMOTER, not a
    # co-equal axis: a highly relevant item with low substance still surfaces, but a
    # zero-substance hype piece gets pushed down. quality in [0.35, 1.0].
    quality = 0.35 + 0.65 * (substance / 10.0)
    return round(relevance * quality * recency, 4)


def score_pending(limit: int | None = None, order: str = "recent") -> int:
    """Score articles missing a substance score. Returns count scored.

    order: 'recent' (newest first — feed-relevant first) or 'engagement'."""
    personas = list_personas(enabled_only=True)
    if not personas:
        return 0

    order_sql = {
        "recent": "COALESCE(published_at, fetched_at) DESC",
        "engagement": "external_score DESC",
    }.get(order, "id DESC")

    with get_connection() as conn:
        max_eng = conn.execute(
            "SELECT COALESCE(max(external_score), 1) FROM articles"
        ).fetchone()[0] or 1
        rows = conn.execute(
            f"SELECT id, title, summary, body, external_score, "
            f"  EXTRACT(EPOCH FROM (now() - COALESCE(published_at, fetched_at))) "
            f"FROM articles WHERE scored_at IS NULL "
            f"ORDER BY {order_sql}" + (f" LIMIT {int(limit)}" if limit else "")
        ).fetchall()

    done = 0
    for aid, title, summary, body, eng, age_s in rows:
        # Judge on the richest text available, capped to keep prompts cheap.
        text = (body or summary or "")
        if summary and len(summary) > len(text):
            text = summary
        text = text[:4000]
        time.sleep(SCORE_DELAY)  # pace to stay under Groq's burst limit
        try:
            sc = _judge(title or "", text, personas)
        except Exception as exc:  # noqa: BLE001 — skip a bad item, keep going
            print(f"[score] article {aid} failed: {type(exc).__name__}")
            continue

        substance = round(sc.substance, 3)
        gap = _hype_gap(float(eng or 0), substance, float(max_eng))  # None if no engagement
        age_days = float(age_s or 0) / 86400.0
        recency = math.exp(-age_days / 45.0)

        with get_connection() as conn:
            conn.execute(
                "UPDATE articles SET substance=%s, hype_gap=%s, "
                "signal_components=%s, scored_at=now() WHERE id=%s",
                (substance, gap, json.dumps({
                    "novelty": sc.novelty, "evidence": sc.evidence,
                    "specificity": sc.specificity, "hype_markers": sc.hype_markers,
                }), aid),
            )
            for p in personas:
                pd = sc.personas.get(p.key, {}) or {}
                rel = float(pd.get("relevance", 0) or 0)
                angle = (pd.get("angle") or "")[:400]
                signal = persona_signal(substance, rel, recency)
                conn.execute(
                    "INSERT INTO article_persona_scores "
                    "(article_id, persona_key, relevance, angle, signal, scored_at) "
                    "VALUES (%s,%s,%s,%s,%s, now()) "
                    "ON CONFLICT (article_id, persona_key) DO UPDATE SET "
                    "relevance=EXCLUDED.relevance, angle=EXCLUDED.angle, "
                    "signal=EXCLUDED.signal, scored_at=now()",
                    (aid, p.key, rel, angle, signal),
                )
            conn.commit()
        done += 1
        if done % 25 == 0:
            print(f"[score] {done}/{len(rows)}")
    return done
