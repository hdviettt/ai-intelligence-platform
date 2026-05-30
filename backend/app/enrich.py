"""Fetch fuller readable text for thin articles (HN/Reddit are link-only, so the
judge would otherwise see a bare headline). HTTP-only — no API cost.

Stores extracted text in articles.body. Marks attempts (even failures) so we
don't re-fetch dead/paywalled URLs every run.
"""
import httpx
from selectolax.parser import HTMLParser

from app.config import get_settings
from app.db import get_connection

THIN_CHARS = 200          # body shorter than this → try to enrich
MIN_FETCHED = 400         # only accept fetched text if it's at least this long
MAX_BODY = 8000           # cap stored body


def _extract(html: str) -> str | None:
    tree = HTMLParser(html)
    for tag in tree.css("script, style, nav, header, footer, aside, form"):
        tag.decompose()
    # Prefer article/main; fall back to whole body.
    node = tree.css_first("article") or tree.css_first("main") or tree.body
    if not node:
        return None
    text = node.text(separator=" ", strip=True)
    text = " ".join(text.split())
    return text[:MAX_BODY] if len(text) >= MIN_FETCHED else None


def enrich_one(url: str, cfg) -> str | None:
    try:
        r = httpx.get(url, timeout=15, follow_redirects=True,
                      headers={"User-Agent": cfg.user_agent})
        if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
            return None
        return _extract(r.text)
    except Exception:  # noqa: BLE001
        return None


def enrich_pending(limit: int | None = None) -> tuple[int, int]:
    """Fill body for thin articles. Returns (attempted, enriched)."""
    cfg = get_settings()
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, url FROM articles "
            "WHERE length(coalesce(body,'')) < %s "
            "  AND (raw->>'enrich_tried') IS NULL "
            "ORDER BY COALESCE(published_at, fetched_at) DESC"
            + (f" LIMIT {int(limit)}" if limit else ""),
            (THIN_CHARS,),
        ).fetchall()

    attempted = enriched = 0
    for aid, url in rows:
        attempted += 1
        text = enrich_one(url, cfg)
        with get_connection() as conn:
            if text:
                conn.execute(
                    "UPDATE articles SET body = %s, "
                    "raw = jsonb_set(coalesce(raw,'{}'), '{enrich_tried}', 'true') "
                    "WHERE id = %s",
                    (text, aid),
                )
                enriched += 1
            else:
                conn.execute(
                    "UPDATE articles SET "
                    "raw = jsonb_set(coalesce(raw,'{}'), '{enrich_tried}', 'true') "
                    "WHERE id = %s",
                    (aid,),
                )
            conn.commit()
    return attempted, enriched
