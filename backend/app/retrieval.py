"""Hybrid retrieval: Postgres FTS (keyword) + pgvector (semantic), fused with RRF.

Ranking blend is retuned for a news corpus: relevance from both signals, plus a
recency boost. PageRank is intentionally dropped — news isn't a link graph.
"""
import math
from dataclasses import dataclass

from app.db import get_connection
from app.embed import embed_query

RRF_K = 60  # reciprocal-rank-fusion constant


@dataclass
class Result:
    id: int
    url: str
    title: str
    summary: str | None
    source: str
    source_type: str
    published_at: object | None
    score: float


def _keyword_ids(conn, query: str, limit: int) -> list[int]:
    rows = conn.execute(
        """
        SELECT id
        FROM articles
        WHERE tsv @@ websearch_to_tsquery('english', %s)
        ORDER BY ts_rank_cd(tsv, websearch_to_tsquery('english', %s)) DESC
        LIMIT %s
        """,
        (query, query, limit),
    ).fetchall()
    return [r[0] for r in rows]


def _vector_ids(conn, query: str, limit: int) -> list[int]:
    qvec = embed_query(query)
    rows = conn.execute(
        """
        SELECT id
        FROM articles
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> %s::vector
        LIMIT %s
        """,
        (qvec, limit),
    ).fetchall()
    return [r[0] for r in rows]


def _rrf(rank_lists: list[list[int]]) -> dict[int, float]:
    scores: dict[int, float] = {}
    for ids in rank_lists:
        for rank, _id in enumerate(ids):
            scores[_id] = scores.get(_id, 0.0) + 1.0 / (RRF_K + rank + 1)
    return scores


def search(query: str, limit: int = 10, candidates: int = 40,
           recency_boost: float = 0.15) -> list[Result]:
    with get_connection() as conn:
        kw = _keyword_ids(conn, query, candidates)
        vec = _vector_ids(conn, query, candidates)
        fused = _rrf([kw, vec])
        if not fused:
            return []

        ids = list(fused.keys())
        rows = conn.execute(
            """
            SELECT id, url, title, summary, source, source_type, published_at,
                   EXTRACT(EPOCH FROM (now() - COALESCE(published_at, fetched_at))) AS age_s
            FROM articles
            WHERE id = ANY(%s)
            """,
            (ids,),
        ).fetchall()

    # Recency: newer items get a small additive boost, decaying over ~30 days.
    results: list[Result] = []
    for (aid, url, title, summary, source, stype, published, age_s) in rows:
        base = fused.get(aid, 0.0)
        age_days = float(age_s or 0) / 86400.0
        recency = recency_boost * math.exp(-age_days / 30.0)
        results.append(
            Result(aid, url, title, summary, source, stype, published, base + recency)
        )

    results.sort(key=lambda r: r.score, reverse=True)
    return results[:limit]
