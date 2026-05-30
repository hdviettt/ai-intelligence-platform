"""The signal judge. One Groq call per article scores persona-INDEPENDENT
substance axes AND a relevance + 'so what' angle for every enabled persona.

Resumable: only scores articles missing a substance score. Persona signal
(substance · relevance/10 · recency) is precomputed so feeds rank instantly.
"""
import json
import math
from dataclasses import dataclass

from app.config import get_settings
from app.db import get_connection
from app.personas import Persona, list_personas

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
    "Then, for EACH persona given, score:\n"
    "- relevance (0-10): does this matter to THIS persona, given what they care "
    "about and their decision lens?\n"
    "- angle: ONE sentence — the 'so what for you' for this persona. Concrete. "
    "If irrelevant, say why briefly.\n"
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


def _hype_gap(engagement: float, substance: float, max_eng: float) -> float:
    # Normalize engagement to 0-10, subtract substance. + = overhyped, - = buried.
    norm = 10.0 * math.log1p(max(0.0, engagement)) / math.log1p(max(1.0, max_eng))
    return round(norm - substance, 3)


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
            f"SELECT id, title, summary, external_score, "
            f"  EXTRACT(EPOCH FROM (now() - COALESCE(published_at, fetched_at))) "
            f"FROM articles WHERE scored_at IS NULL "
            f"ORDER BY {order_sql}" + (f" LIMIT {int(limit)}" if limit else "")
        ).fetchall()

    done = 0
    for aid, title, summary, eng, age_s in rows:
        try:
            sc = _judge(title or "", summary or "", personas)
        except Exception as exc:  # noqa: BLE001 — skip a bad item, keep going
            print(f"[score] article {aid} failed: {type(exc).__name__}")
            continue

        substance = round(sc.substance, 3)
        gap = _hype_gap(float(eng or 0), substance, float(max_eng))
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
                signal = round(substance * (rel / 10.0) * recency, 4)
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
