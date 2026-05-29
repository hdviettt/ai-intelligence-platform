"""arXiv connector — recent papers from the AI categories via the RSS feeds.

Uses rss.arxiv.org, which is not rate-limited (unlike the export.arxiv.org API,
which throttles aggressively) and returns full abstracts. One feed per category.
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
from app.ingest.base import Article, ensure_source, log_run, upsert_articles

SOURCE = "arxiv"
CATEGORIES = ["cs.AI", "cs.LG", "cs.CL"]
FEED = "https://rss.arxiv.org/rss/{cat}"


def _to_dt(entry) -> datetime | None:
    st = entry.get("published_parsed") or entry.get("updated_parsed")
    if st:
        return datetime(*st[:6], tzinfo=timezone.utc)
    return None


@retry(
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
    wait=wait_exponential(multiplier=2, min=2, max=20),
    stop=stop_after_attempt(4),
    reraise=True,
)
def _get(url: str, cfg) -> httpx.Response:
    resp = httpx.get(
        url, timeout=45.0, follow_redirects=True,
        headers={"User-Agent": cfg.user_agent},
    )
    resp.raise_for_status()
    return resp


def fetch(max_results: int = 50) -> list[Article]:
    cfg = get_settings()
    per_cat = max(1, max_results // len(CATEGORIES))
    seen: set[str] = set()
    articles: list[Article] = []

    for cat in CATEGORIES:
        resp = _get(FEED.format(cat=cat), cfg)
        feed = feedparser.parse(resp.text)
        for e in feed.entries[:per_cat]:
            link = e.get("link")
            if not link or link in seen:
                continue
            seen.add(link)
            # RSS description is "arXiv:ID Announce Type: new\nAbstract: ..."
            desc = (e.get("summary") or "")
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
                    source=SOURCE,
                    source_type="paper",
                    published_at=_to_dt(e),
                    raw={"id": e.get("id"), "category": cat,
                         "announce_type": e.get("arxiv_announce_type")},
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
