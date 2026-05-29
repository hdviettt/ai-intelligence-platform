"""Generic RSS/Atom connector — one connector for all feed-based sources.

Covers lab blogs (OpenAI, Anthropic, DeepMind, Meta, HuggingFace) and AI
newsletters/news feeds. Each feed is registered with a source name + type so the
corpus stays attributable.
"""
import time
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
from app.ingest.base import Article, ensure_source, log_run, upsert_articles

# (source_name, source_type, base_url, feed_url)
# Verified live 2026-05-29. Deferred (no working RSS found yet, need HTML scraping):
#   anthropic-blog  -> /rss.xml and /news/rss.xml both 404
#   meta-ai-blog    -> /blog/rss/ and /blog/feed/ both 404
#   the-batch       -> /the-batch/feed/ 404
FEEDS = [
    ("openai-blog",   "release", "https://openai.com",            "https://openai.com/news/rss.xml"),
    ("deepmind-blog", "release", "https://deepmind.google",       "https://deepmind.google/blog/rss.xml"),
    ("huggingface",   "release", "https://huggingface.co",        "https://huggingface.co/blog/feed.xml"),
    ("google-ai-blog","news",    "https://blog.google",           "https://blog.google/technology/ai/rss"),
    ("import-ai",     "news",    "https://importai.substack.com", "https://importai.substack.com/feed"),
]


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
    resp = httpx.get(
        url, timeout=30.0, follow_redirects=True,
        headers={"User-Agent": cfg.user_agent},
    )
    resp.raise_for_status()
    return resp


def fetch_feed(source: str, source_type: str, feed_url: str,
               max_results: int = 30) -> list[Article]:
    cfg = get_settings()
    resp = _get(feed_url, cfg)
    feed = feedparser.parse(resp.text)

    articles: list[Article] = []
    for e in feed.entries[:max_results]:
        link = e.get("link")
        title = (e.get("title") or "").strip()
        if not link or not title:
            continue
        # Prefer full content when present, else summary.
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
                source=source,
                source_type=source_type,
                published_at=_to_dt(e),
                raw={"id": e.get("id")},
            )
        )
    return articles


def run_feed(source: str, source_type: str, base_url: str, feed_url: str,
             max_results: int = 30) -> tuple[int, int, int]:
    ensure_source(source, source_type, base_url)
    error = None
    articles: list[Article] = []
    inserted = updated = 0
    try:
        articles = fetch_feed(source, source_type, feed_url, max_results)
        inserted, updated = upsert_articles(articles)
    except Exception as exc:  # noqa: BLE001
        error = repr(exc)
    finally:
        log_run(source, len(articles), inserted, updated, error)
    status = "ok" if error is None else f"ERROR {error[:80]}"
    print(f"[{source}] fetched={len(articles)} inserted={inserted} "
          f"updated={updated} {status}")
    return len(articles), inserted, updated


def run(max_results: int = 30) -> tuple[int, int, int]:
    """Run every registered feed. One feed failing does not stop the rest."""
    total_f = total_i = total_u = 0
    for source, stype, base, feed_url in FEEDS:
        f, i, u = run_feed(source, stype, base, feed_url, max_results)
        total_f += f
        total_i += i
        total_u += u
        time.sleep(1)  # be polite between hosts
    print(f"[rss] TOTAL fetched={total_f} inserted={total_i} updated={total_u}")
    return total_f, total_i, total_u


if __name__ == "__main__":
    run()
