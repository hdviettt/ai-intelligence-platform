"""arXiv connector — recent papers from the AI categories.

Uses the public arXiv Atom API. No key required.
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
from app.ingest.base import Article, ensure_source, log_run, upsert_articles

SOURCE = "arxiv"
API = "https://export.arxiv.org/api/query"
CATEGORIES = ["cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.MA"]


def _to_dt(struct_time) -> datetime | None:
    if not struct_time:
        return None
    return datetime(*struct_time[:6], tzinfo=timezone.utc)


@retry(
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
    wait=wait_exponential(multiplier=3, min=3, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _get(url: str, cfg) -> httpx.Response:
    # arXiv asks for ~3s between requests; be a polite citizen up front.
    time.sleep(3)
    resp = httpx.get(
        url, timeout=60.0, headers={"User-Agent": cfg.user_agent}
    )
    resp.raise_for_status()
    return resp


def fetch(max_results: int = 50) -> list[Article]:
    cfg = get_settings()
    query = "+OR+".join(f"cat:{c}" for c in CATEGORIES)
    url = (
        f"{API}?search_query={query}"
        f"&sortBy=submittedDate&sortOrder=descending"
        f"&start=0&max_results={max_results}"
    )
    resp = _get(url, cfg)
    feed = feedparser.parse(resp.text)

    articles: list[Article] = []
    for e in feed.entries:
        authors = ", ".join(a.get("name", "") for a in e.get("authors", []))
        abstract = (e.get("summary") or "").replace("\n", " ").strip()
        articles.append(
            Article(
                url=e.get("link"),
                title=(e.get("title") or "").replace("\n", " ").strip(),
                summary=abstract,
                body=abstract,  # papers: abstract is the body we index/chunk
                author=authors or None,
                source=SOURCE,
                source_type="paper",
                published_at=_to_dt(e.get("published_parsed")),
                raw={
                    "id": e.get("id"),
                    "tags": [t.get("term") for t in e.get("tags", [])],
                },
            )
        )
    return articles


def run(max_results: int = 50) -> tuple[int, int, int]:
    ensure_source(SOURCE, "paper", "https://arxiv.org")
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
    print(f"[arxiv] fetched={len(articles)} inserted={inserted} updated={updated}")
    return len(articles), inserted, updated


if __name__ == "__main__":
    run()
