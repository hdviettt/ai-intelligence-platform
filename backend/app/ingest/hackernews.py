"""Hacker News connector — recent AI stories via the Algolia HN API.

Config (per ingest_sources row): {"query": "...", "min_points": 5}.
"""
from datetime import datetime, timezone

import httpx

from app.config import get_settings
from app.ingest.base import Article, IngestSource

API = "https://hn.algolia.com/api/v1/search_by_date"
DEFAULT_QUERY = "AI OR LLM OR GPT OR Claude OR Gemini"


def fetch_one(source: IngestSource) -> list[Article]:
    cfg = get_settings()
    query = source.config.get("query") or DEFAULT_QUERY
    min_points = int(source.config.get("min_points", 5))
    resp = httpx.get(
        API,
        params={
            "query": query,
            "tags": "story",
            "numericFilters": f"points>{min_points}",
            "hitsPerPage": source.max_results,
        },
        timeout=cfg.request_timeout,
        headers={"User-Agent": cfg.user_agent},
    )
    resp.raise_for_status()
    hits = resp.json().get("hits", [])

    articles: list[Article] = []
    for h in hits:
        title = h.get("title")
        if not title:
            continue
        story_url = h.get("url")
        hn_url = f"https://news.ycombinator.com/item?id={h.get('objectID')}"
        created = h.get("created_at_i")
        published = datetime.fromtimestamp(created, tz=timezone.utc) if created else None
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
                raw={"objectID": h.get("objectID"),
                     "num_comments": h.get("num_comments"), "hn_url": hn_url},
            )
        )
    return articles
