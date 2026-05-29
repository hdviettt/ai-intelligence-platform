"""arXiv connector — recent papers via the (un-throttled) rss.arxiv.org feeds.

Config (per ingest_sources row): {"categories": ["cs.AI", "cs.LG", "cs.CL"]}.
"""
from datetime import datetime, timezone

import feedparser
import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings
from app.ingest.base import Article, IngestSource

FEED = "https://rss.arxiv.org/rss/{cat}"
DEFAULT_CATEGORIES = ["cs.AI", "cs.LG", "cs.CL"]


def _to_dt(entry) -> datetime | None:
    st = entry.get("published_parsed") or entry.get("updated_parsed")
    return datetime(*st[:6], tzinfo=timezone.utc) if st else None


@retry(
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
    wait=wait_exponential(multiplier=2, min=2, max=20),
    stop=stop_after_attempt(4),
    reraise=True,
)
def _get(url: str, cfg) -> httpx.Response:
    resp = httpx.get(url, timeout=45.0, follow_redirects=True,
                     headers={"User-Agent": cfg.user_agent})
    resp.raise_for_status()
    return resp


def fetch_one(source: IngestSource) -> list[Article]:
    cfg = get_settings()
    categories = source.config.get("categories") or DEFAULT_CATEGORIES
    per_cat = max(1, source.max_results // len(categories))
    seen: set[str] = set()
    articles: list[Article] = []

    for cat in categories:
        resp = _get(FEED.format(cat=cat), cfg)
        feed = feedparser.parse(resp.text)
        for e in feed.entries[:per_cat]:
            link = e.get("link")
            if not link or link in seen:
                continue
            seen.add(link)
            desc = e.get("summary") or ""
            abstract = desc.split("Abstract:", 1)[-1].replace("\n", " ").strip()
            authors = e.get("author") or ", ".join(
                a.get("name", "") for a in e.get("authors", [])
            )
            articles.append(
                Article(
                    url=link,
                    title=(e.get("title") or "").replace("\n", " ").strip(),
                    summary=abstract or None,
                    body=abstract or None,
                    author=authors or None,
                    source=source.name,
                    source_type=source.source_type,
                    published_at=_to_dt(e),
                    raw={"id": e.get("id"), "category": cat,
                         "announce_type": e.get("arxiv_announce_type")},
                )
            )
    return articles
