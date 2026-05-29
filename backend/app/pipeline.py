"""Reusable ingest + embed pipeline.

One code path shared by the CLI scripts, the scheduled cron job, and (later) the
control-panel trigger button. Functions return structured results so callers can
report what happened instead of only printing.
"""
from dataclasses import dataclass, field

from app.db import get_connection
from app.embed import chunk_text, embed
from app.ingest import arxiv, hackernews, rss

EMBED_BATCH = 64

# name -> connector run(max_results)
CONNECTORS = {
    "arxiv": arxiv.run,
    "hackernews": hackernews.run,
    "rss": rss.run,
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

    @property
    def total_inserted(self) -> int:
        return sum(i.inserted for i in self.ingests)

    @property
    def total_fetched(self) -> int:
        return sum(i.fetched for i in self.ingests)


def run_ingest(sources: list[str] | None = None, max_results: int = 50) -> list[IngestResult]:
    """Run the named connectors (default: all). One failing source never stops the rest."""
    targets = sources or list(CONNECTORS)
    results: list[IngestResult] = []
    for name in targets:
        run = CONNECTORS.get(name)
        if not run:
            results.append(IngestResult(name, error=f"unknown source '{name}'"))
            continue
        try:
            fetched, inserted, updated = run(max_results=max_results)
            results.append(IngestResult(name, fetched, inserted, updated))
        except Exception as exc:  # noqa: BLE001
            results.append(IngestResult(name, error=repr(exc)))
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
                            "INSERT INTO chunks (article_id, chunk_index, content, embedding) "
                            "VALUES (%s, %s, %s, %s) "
                            "ON CONFLICT (article_id, chunk_index) DO NOTHING",
                            (aid, idx, ctext, cvec),
                        )
            conn.commit()
        done += len(batch)
    return done


def run_pipeline(sources: list[str] | None = None, max_results: int = 50) -> PipelineResult:
    """Full refresh: ingest the sources, then embed whatever is new."""
    ingests = run_ingest(sources, max_results=max_results)
    embedded = embed_pending()
    return PipelineResult(ingests=ingests, embedded=embedded)
