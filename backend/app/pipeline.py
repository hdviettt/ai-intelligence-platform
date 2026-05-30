"""Reusable ingest + embed pipeline, driven by the ingest_sources table.

One code path shared by the CLI, the cron job, and the admin trigger. Sources are
data (managed from /admin); this module just loads enabled rows, dispatches each
to its connector, then embeds whatever is new.
"""
import json
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

from app.db import get_connection
from app.embed import chunk_text, embed
from app.ingest import arxiv, hackernews, rss
from app.ingest.base import (
    IngestSource,
    ensure_source,
    list_sources,
    log_run,
    upsert_articles,
)

EMBED_BATCH = 64

# connector name -> fetch_one(source) -> list[Article]
FETCHERS = {
    "rss": rss.fetch_one,
    "arxiv": arxiv.fetch_one,
    "hackernews": hackernews.fetch_one,
}


@dataclass
class IngestResult:
    source: str
    fetched: int = 0
    inserted: int = 0
    updated: int = 0
    error: str | None = None


@dataclass
class PipelineResult:
    ingests: list[IngestResult] = field(default_factory=list)
    embedded: int = 0
    total_before: int = 0
    total_after: int = 0
    chunks_after: int = 0

    @property
    def total_inserted(self) -> int:
        return sum(i.inserted for i in self.ingests)

    @property
    def total_fetched(self) -> int:
        return sum(i.fetched for i in self.ingests)


def run_source(src: IngestSource, max_override: int | None = None) -> IngestResult:
    """Fetch one configured source, upsert, log. Never raises — errors captured."""
    if max_override:
        src.max_results = max_override
    fetcher = FETCHERS.get(src.connector)
    if not fetcher:
        log_run(src.name, 0, 0, 0, f"unknown connector '{src.connector}'")
        return IngestResult(src.name, error=f"unknown connector '{src.connector}'")

    ensure_source(src.name, src.source_type, src.config.get("base_url"))
    error = None
    articles = []
    inserted = updated = 0
    try:
        articles = fetcher(src)
        inserted, updated = upsert_articles(articles)
    except Exception as exc:  # noqa: BLE001
        error = repr(exc)
    finally:
        log_run(src.name, len(articles), inserted, updated, error)
    status = "ok" if error is None else f"ERROR {error[:80]}"
    print(f"[{src.name}] fetched={len(articles)} inserted={inserted} "
          f"updated={updated} {status}")
    return IngestResult(src.name, len(articles), inserted, updated, error)


def run_ingest(names: list[str] | None = None,
               max_override: int | None = None) -> list[IngestResult]:
    """Run enabled sources (optionally filtered to `names`). One failure never
    stops the rest."""
    sources = list_sources(enabled_only=True)
    if names:
        wanted = set(names)
        sources = [s for s in sources if s.name in wanted]
    results: list[IngestResult] = []
    for i, src in enumerate(sources):
        results.append(run_source(src, max_override=max_override))
        if i < len(sources) - 1:
            time.sleep(1)  # polite between hosts
    return results


def embed_pending() -> int:
    """Embed every article whose embedding is NULL. Returns count embedded."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, title, summary, body FROM articles "
            "WHERE embedding IS NULL ORDER BY id"
        ).fetchall()

    if not rows:
        return 0

    done = 0
    for i in range(0, len(rows), EMBED_BATCH):
        batch = rows[i : i + EMBED_BATCH]
        doc_texts = [f"{r[1]}\n\n{r[2] or ''}".strip() for r in batch]
        doc_vecs = embed(doc_texts, input_type="document")

        with get_connection() as conn:
            for (aid, _title, summary, body), vec in zip(batch, doc_vecs):
                conn.execute(
                    "UPDATE articles SET embedding = %s WHERE id = %s", (vec, aid)
                )
                chunks = chunk_text(body or summary or "")
                if chunks:
                    cvecs = embed(chunks, input_type="document")
                    conn.execute("DELETE FROM chunks WHERE article_id = %s", (aid,))
                    for idx, (ctext, cvec) in enumerate(zip(chunks, cvecs)):
                        conn.execute(
                            "INSERT INTO chunks (article_id, chunk_index, content, "
                            "embedding) VALUES (%s, %s, %s, %s) "
                            "ON CONFLICT (article_id, chunk_index) DO NOTHING",
                            (aid, idx, ctext, cvec),
                        )
            conn.commit()
        done += len(batch)
    return done


def _count(conn, table: str) -> int:
    return conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]


_THEME = {"paper": "Research", "release": "Releases", "news": "News",
          "discussion": "Discussion"}


def _diversity(conn) -> tuple[int, dict]:
    """Distinct live sources + article counts per theme — the breadth snapshot."""
    distinct = conn.execute(
        "SELECT count(DISTINCT source) FROM articles"
    ).fetchone()[0]
    rows = conn.execute(
        "SELECT source_type, count(*) FROM articles GROUP BY 1"
    ).fetchall()
    themes: dict[str, int] = {}
    for stype, n in rows:
        key = _THEME.get(stype, "Other")
        themes[key] = themes.get(key, 0) + n
    return distinct, themes


def run_pipeline(names: list[str] | None = None, max_override: int | None = None,
                 trigger: str = "manual") -> PipelineResult:
    """Full refresh: ingest the (enabled) sources, then embed what's new.

    Records a `pipeline_runs` row capturing corpus DEPTH (size/chunks) and
    DIVERSITY (distinct sources, theme breakdown) so /admin can show the index
    getting both bigger and broader over time."""
    started = datetime.now(timezone.utc)
    with get_connection() as conn:
        total_before = _count(conn, "articles")

    ingests = run_ingest(names, max_override=max_override)
    embedded = embed_pending()

    with get_connection() as conn:
        total_after = _count(conn, "articles")
        chunks_after = _count(conn, "chunks")
        distinct_sources, theme_breakdown = _diversity(conn)

    inserted = sum(i.inserted for i in ingests)
    updated = sum(i.updated for i in ingests)
    per_source = [asdict(i) for i in ingests]

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO pipeline_runs (trigger, started_at, finished_at, "
            "total_before, total_after, inserted, updated, embedded, chunks_after, "
            "per_source, distinct_sources, theme_breakdown) "
            "VALUES (%s, %s, now(), %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (trigger, started, total_before, total_after, inserted, updated,
             embedded, chunks_after, json.dumps(per_source),
             distinct_sources, json.dumps(theme_breakdown)),
        )
        conn.commit()

    return PipelineResult(ingests=ingests, embedded=embedded,
                          total_before=total_before, total_after=total_after,
                          chunks_after=chunks_after)
