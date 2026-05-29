"""Generic RSS/Atom connector — one connector for all feed-based sources.

Config (per ingest_sources row): {"feed_url": "...", "base_url": "..."}.
"""
from datetime import datetime, timezone

import feedparser
import httpx
from selectolax.parser import HTMLParser
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings
from app.ingest.base import Article, IngestSource


def _to_dt(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        st = entry.get(key)
        if st:
            return datetime(*st[:6], tzinfo=timezone.utc)
    return None


def _clean_html(raw: str | None) -> str | None:
    if not raw:
        return None
    text = HTMLParser(raw).text(separator=" ").strip()
    return text or None


@retry(
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
    wait=wait_exponential(multiplier=2, min=2, max=20),
    stop=stop_after_attempt(4),
    reraise=True,
)
def _get(url: str, cfg) -> httpx.Response:
    resp = httpx.get(url, timeout=30.0, follow_redirects=True,
                     headers={"User-Agent": cfg.user_agent})
    resp.raise_for_status()
    return resp


def fetch_one(source: IngestSource) -> list[Article]:
    cfg = get_settings()
    feed_url = source.config.get("feed_url")
    if not feed_url:
        raise ValueError(f"rss source '{source.name}' has no feed_url in config")
    resp = _get(feed_url, cfg)
    feed = feedparser.parse(resp.text)

    articles: list[Article] = []
    for e in feed.entries[: source.max_results]:
        link = e.get("link")
        title = (e.get("title") or "").strip()
        if not link or not title:
            continue
        body = None
        if e.get("content"):
            body = _clean_html(e["content"][0].get("value"))
        summary = _clean_html(e.get("summary"))
        articles.append(
            Article(
                url=link,
                title=title,
                summary=summary,
                body=body or summary,
                author=e.get("author"),
                source=source.name,
                source_type=source.source_type,
                published_at=_to_dt(e),
                raw={"id": e.get("id")},
            )
        )
    return articles
