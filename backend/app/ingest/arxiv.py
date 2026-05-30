"""arXiv connector — deep backfill via the export API (paginated), with the RSS
feed as a fast path for small/recent pulls.

Config (per ingest_sources row):
  {"categories": ["cs.AI","cs.LG",...]}   # which categories
  max_results controls depth:
    <= 100  -> RSS feed (fast, recent only)
    >  100  -> export API, paginated start/max with rate limiting (full archive)

The export API 429s if hammered, so we sleep between every page (arXiv asks ~3s).
"""
import time
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

RSS_FEED = "https://rss.arxiv.org/rss/{cat}"
EXPORT_API = "https://export.arxiv.org/api/query"
DEFAULT_CATEGORIES = ["cs.AI", "cs.LG", "cs.CL"]
PAGE = 100            # export API page size
ARXIV_DELAY = 3.0     # seconds between export requests (arXiv etiquette)


def _to_dt(entry) -> datetime | None:
    st = entry.get("published_parsed") or entry.get("updated_parsed")
    return datetime(*st[:6], tzinfo=timezone.utc) if st else None


@retry(
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
    wait=wait_exponential(multiplier=3, min=5, max=60),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _get(url: str, cfg, params=None) -> httpx.Response:
    resp = httpx.get(url, params=params, timeout=60.0, follow_redirects=True,
                     headers={"User-Agent": cfg.user_agent})
    resp.raise_for_status()
    return resp


def _entry_to_article(e, source: IngestSource, cat: str) -> Article | None:
    link = e.get("link")
    title = (e.get("title") or "").replace("\n", " ").strip()
    if not link or not title:
        return None
    desc = e.get("summary") or ""
    abstract = desc.split("Abstract:", 1)[-1].replace("\n", " ").strip()
    authors = e.get("author") or ", ".join(
        a.get("name", "") for a in e.get("authors", [])
    )
    return Article(
        url=link, title=title, summary=abstract or None, body=abstract or None,
        author=authors or None, source=source.name,
        source_type=source.source_type, published_at=_to_dt(e),
        raw={"id": e.get("id"), "category": cat,
             "announce_type": e.get("arxiv_announce_type")},
    )


def _fetch_rss(source: IngestSource, categories: list[str], cfg) -> list[Article]:
    per_cat = max(1, source.max_results // len(categories))
    seen: set[str] = set()
    out: list[Article] = []
    for cat in categories:
        resp = _get(RSS_FEED.format(cat=cat), cfg)
        feed = feedparser.parse(resp.text)
        for e in feed.entries[:per_cat]:
            a = _entry_to_article(e, source, cat)
            if a and a.url not in seen:
                seen.add(a.url)
                out.append(a)
    return out


def _fetch_export(source: IngestSource, categories: list[str], cfg) -> list[Article]:
    """Deep paginated pull from the export API. Splits the budget per category.

    arXiv's export API is frequently slow / 503 / times out. A failure on one
    category is logged and skipped so the rest (and the run) still proceed."""
    per_cat = max(PAGE, source.max_results // len(categories))
    seen: set[str] = set()
    out: list[Article] = []
    for cat in categories:
        got = 0
        start = 0
        while got < per_cat:
            params = {
                "search_query": f"cat:{cat}",
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "start": start,
                "max_results": min(PAGE, per_cat - got),
            }
            time.sleep(ARXIV_DELAY)
            try:
                resp = _get(EXPORT_API, cfg, params=params)
            except Exception as exc:  # noqa: BLE001 — 503/timeout: skip this category
                print(f"[arxiv] {cat} export failed ({type(exc).__name__}); skipping")
                break
            feed = feedparser.parse(resp.text)
            if not feed.entries:
                break
            for e in feed.entries:
                a = _entry_to_article(e, source, cat)
                if a and a.url not in seen:
                    seen.add(a.url)
                    out.append(a)
            got += len(feed.entries)
            start += len(feed.entries)
            if len(feed.entries) < params["max_results"]:
                break
    return out


def fetch_one(source: IngestSource) -> list[Article]:
    """Try the deep export pull for big requests; if it yields nothing (arXiv
    down / weekend), fall back to the RSS feeds. RSS is empty on weekends, so on a
    bad day this returns [] and the next cron run picks papers up — never errors."""
    cfg = get_settings()
    categories = source.config.get("categories") or DEFAULT_CATEGORIES
    if source.max_results <= 100:
        return _fetch_rss(source, categories, cfg)
    articles = _fetch_export(source, categories, cfg)
    if not articles:
        try:
            articles = _fetch_rss(source, categories, cfg)
        except Exception as exc:  # noqa: BLE001
            print(f"[arxiv] RSS fallback failed ({type(exc).__name__})")
    return articles
