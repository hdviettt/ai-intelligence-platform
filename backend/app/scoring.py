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
    retry_if_exception,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings
from app.db import get_connection
from app.personas import Persona, list_personas

# Pacing between scoring calls. Groq gpt-oss-120b is fast; light pacing plus
# retry/backoff keeps us under the RPM ceiling. Override via SCORE_DELAY env for a
# faster one-off backfill on a paid tier.
import os

SCORE_DELAY = float(os.getenv("SCORE_DELAY", "0.3"))  # seconds between scoring calls

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


def _prompt(title: str, summary: str, personas: list[Persona]) -> str:
    return (
        f"{RUBRIC}\n\nPersonas:\n{_persona_block(personas)}\n\n"
        f"Return exactly this shape:\n{_schema_hint(personas)}\n\n"
        f"ITEM:\nTitle: {title}\nText: {summary or '(no summary)'}"
    )


def _parse(raw: str) -> Score:
    # Tolerate models that wrap JSON in prose/fences.
    s = raw.strip()
    if "{" in s:
        s = s[s.index("{"): s.rindex("}") + 1]
    data = json.loads(s)
    return Score(
        novelty=float(data.get("novelty", 0)),
        evidence=float(data.get("evidence", 0)),
        specificity=float(data.get("specificity", 0)),
        hype_markers=float(data.get("hype_markers", 0)),
        personas=data.get("personas", {}),
    )


def _judge_anthropic(prompt: str, cfg) -> Score:
    import anthropic

    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=1024,
        temperature=0,
        system="You output only valid JSON, no prose, no code fences.",
        messages=[{"role": "user", "content": prompt}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    return _parse(text)


def _judge_groq(prompt: str, cfg) -> Score:
    from groq import Groq

    # Dedicated scoring model (gpt-oss-120b), NOT groq_model (the fast search overview
    # model). Scoring is a rubric/classification task, so reasoning_effort="low" keeps
    # the whole-corpus backfill fast and near-budget (medium reasoning bills hidden
    # reasoning tokens per call). Fall back to no reasoning_effort if it's rejected;
    # json_object mode is kept in both branches for clean parsing.
    client = Groq(api_key=cfg.groq_api_key)
    kwargs = dict(
        model=cfg.scoring_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    try:
        resp = client.chat.completions.create(reasoning_effort="low", **kwargs)
    except Exception:  # noqa: BLE001
        resp = client.chat.completions.create(**kwargs)
    return _parse(resp.choices[0].message.content)


class _AuthError(Exception):
    """Non-retryable: bad API key. Surfaced immediately so we don't burn retries."""


def _retryable(exc: Exception) -> bool:
    # Never retry auth/permission failures (401/403) — they won't self-heal.
    if isinstance(exc, _AuthError):
        return False
    s = str(exc).lower()
    return "401" not in s and "invalid x-api-key" not in s and "403" not in s


@retry(
    retry=retry_if_exception_type(Exception) & retry_if_exception(_retryable),
    wait=wait_exponential(multiplier=3, min=2, max=45),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _judge(title: str, summary: str, personas: list[Persona]) -> Score:
    cfg = get_settings()
    prompt = _prompt(title, summary, personas)
    if cfg.scoring_provider == "anthropic" and cfg.anthropic_api_key:
        return _judge_anthropic(prompt, cfg)
    return _judge_groq(prompt, cfg)


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
