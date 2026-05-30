"""Hacker News connector — AI stories via the Algolia HN API, paginated.

Config (per ingest_sources row):
  {"queries": ["LLM", "GPT", ...], "min_points": 8}   # preferred: list of simple terms
  {"query": "LLM", "min_points": 8}                    # single term (back-compat)

Algolia chokes on complex multi-OR + quoted-phrase queries (returns 0), so we run
a list of SIMPLE queries and dedup. Each query paginates up to cover max_results.
"""
from datetime import datetime, timezone

import httpx

from app.config import get_settings
from app.ingest.base import Article, IngestSource

API = "https://hn.algolia.com/api/v1/search_by_date"
DEFAULT_QUERIES = ["LLM", "GPT", "Claude AI", "Gemini AI", "OpenAI",
                   "Anthropic", "language model", "neural network"]
PAGE_SIZE = 100


def _fetch_query(query: str, min_points: int, want: int, cfg) -> list[dict]:
    hits: list[dict] = []
    page = 0
    while len(hits) < want:
        resp = httpx.get(
            API,
            params={
                "query": query,
                "tags": "story",
                "numericFilters": f"points>{min_points}",
                "hitsPerPage": PAGE_SIZE,
                "page": page,
            },
            timeout=cfg.request_timeout,
            headers={"User-Agent": cfg.user_agent},
        )
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("hits", [])
        if not batch:
            break
        hits.extend(batch)
        page += 1
        if page >= data.get("nbPages", 0):
            break
    return hits


def fetch_one(source: IngestSource) -> list[Article]:
    cfg = get_settings()
    min_points = int(source.config.get("min_points", 8))
    queries = source.config.get("queries")
    if not queries:
        single = source.config.get("query")
        queries = [single] if single else DEFAULT_QUERIES
    # Spread the budget across queries.
    per_query = max(PAGE_SIZE, source.max_results // max(1, len(queries)))

    seen: set[str] = set()
    articles: list[Article] = []
    for q in queries:
        for h in _fetch_query(q, min_points, per_query, cfg):
            oid = h.get("objectID")
            title = h.get("title")
            if not title or oid in seen:
                continue
            seen.add(oid)
            story_url = h.get("url")
            hn_url = f"https://news.ycombinator.com/item?id={oid}"
            created = h.get("created_at_i")
            published = (
                datetime.fromtimestamp(created, tz=timezone.utc) if created else None
            )
            articles.append(
                Article(
                    url=story_url or hn_url,
                    title=title.strip(),
                    summary=(h.get("story_text") or "").strip()[:2000] or None,
                    author=h.get("author"),
                    source=source.name,
                    source_type=source.source_type,
                    published_at=published,
                    external_score=float(h.get("points") or 0),
                    raw={"objectID": oid, "num_comments": h.get("num_comments"),
                         "hn_url": hn_url, "query": q},
                )
            )
    return articles
