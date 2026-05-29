"""Hacker News connector — recent AI-related stories via the Algolia HN API.

Public API, no key. Captures the 'discussion' angle of the AI beat; points feed
the engagement signal used in ranking and, later, hype-vs-signal scoring.
"""
from datetime import datetime, timezone

import httpx

from app.config import get_settings
from app.ingest.base import Article, ensure_source, log_run, upsert_articles

SOURCE = "hackernews"
API = "https://hn.algolia.com/api/v1/search_by_date"
QUERY = "AI OR LLM OR GPT OR Claude OR Gemini"


def fetch(max_results: int = 50, min_points: int = 5) -> list[Article]:
    cfg = get_settings()
    resp = httpx.get(
        API,
        params={
            "query": QUERY,
            "tags": "story",
            "numericFilters": f"points>{min_points}",
            "hitsPerPage": max_results,
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
                source=SOURCE,
                source_type="discussion",
                published_at=published,
                external_score=float(h.get("points") or 0),
                raw={"objectID": h.get("objectID"),
                     "num_comments": h.get("num_comments"), "hn_url": hn_url},
            )
        )
    return articles


def run(max_results: int = 50) -> tuple[int, int, int]:
    ensure_source(SOURCE, "discussion", "https://news.ycombinator.com")
    error = None
    articles: list[Article] = []
    inserted = updated = 0
    try:
        articles = fetch(max_results=max_results)
        inserted, updated = upsert_articles(articles)
    except Exception as exc:  # noqa: BLE001
        error = repr(exc)
        raise
    finally:
        log_run(SOURCE, len(articles), inserted, updated, error)
    print(f"[hackernews] fetched={len(articles)} inserted={inserted} updated={updated}")
    return len(articles), inserted, updated


if __name__ == "__main__":
    run()
