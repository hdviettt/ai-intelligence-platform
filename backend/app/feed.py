"""Persona feed — the curated 'what matters to you' stream.

Ranks scored articles by persona_signal (relevance-led, substance-demoted,
recency-weighted). Each item carries its 'so what for you' angle and the score
components, so the UI can show WHY it ranks. Falls back gracefully while the
corpus is still being scored.
"""
from dataclasses import dataclass

from app.db import get_connection
from app.discovery import theme_for


@dataclass
class FeedItem:
    id: int
    url: str
    title: str
    summary: str | None
    source: str
    source_type: str
    theme: str
    published_at: object | None
    signal: float
    relevance: float
    substance: float | None
    hype_gap: float | None
    angle: str | None


def persona_feed(persona_key: str, limit: int = 20, min_relevance: float = 4.0,
                 days: int | None = None) -> list[FeedItem]:
    """Top scored articles for a persona, by precomputed signal."""
    where = ["s.persona_key = %s", "s.relevance >= %s", "a.scored_at IS NOT NULL"]
    params: list = [persona_key, min_relevance]
    if days:
        where.append("COALESCE(a.published_at, a.fetched_at) > now() - (%s || ' days')::interval")
        params.append(days)
    params.append(limit)

    with get_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT a.id, a.url, a.title, a.summary, a.source, a.source_type,
                   a.published_at, s.signal, s.relevance, a.substance, a.hype_gap,
                   s.angle
            FROM article_persona_scores s
            JOIN articles a ON a.id = s.article_id
            WHERE {' AND '.join(where)}
            ORDER BY s.signal DESC
            LIMIT %s
            """,
            tuple(params),
        ).fetchall()

    return [
        FeedItem(
            id=r[0], url=r[1], title=r[2], summary=r[3], source=r[4],
            source_type=r[5], theme=theme_for(r[5]), published_at=r[6],
            signal=float(r[7] or 0), relevance=float(r[8] or 0),
            substance=(float(r[9]) if r[9] is not None else None),
            hype_gap=(float(r[10]) if r[10] is not None else None),
            angle=r[11],
        )
        for r in rows
    ]


def feed_stats(persona_key: str) -> dict:
    """Coverage so the UI can be honest about how much is scored."""
    with get_connection() as conn:
        scored = conn.execute(
            "SELECT count(*) FROM articles WHERE scored_at IS NOT NULL"
        ).fetchone()[0]
        total = conn.execute("SELECT count(*) FROM articles").fetchone()[0]
        relevant = conn.execute(
            "SELECT count(*) FROM article_persona_scores "
            "WHERE persona_key = %s AND relevance >= 4",
            (persona_key,),
        ).fetchone()[0]
    return {"scored": scored, "total": total, "relevant": relevant}
