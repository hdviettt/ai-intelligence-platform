"""Admin/control endpoints: corpus stats, source health, manual ingest trigger.

Read endpoints are open (no secrets, no writes). The trigger endpoint mutates the
corpus, so it requires a shared-secret token AND is disabled entirely unless
ADMIN_TOKEN is configured. Full login auth comes before any public launch.
"""
from dataclasses import asdict

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.db import get_connection
from app import pipeline

router = APIRouter(prefix="/admin", tags=["admin"])


class CorpusStats(BaseModel):
    total: int
    embedded: int
    chunks: int
    by_source: list[dict]
    by_theme: list[dict]


class RunRow(BaseModel):
    source: str
    finished_at: str | None
    fetched: int
    inserted: int
    updated: int
    error: str | None


THEME = {"paper": "Research", "release": "Releases", "news": "News",
         "discussion": "Discussion"}


@router.get("/stats", response_model=CorpusStats)
def stats() -> CorpusStats:
    with get_connection() as conn:
        total = conn.execute("SELECT count(*) FROM articles").fetchone()[0]
        embedded = conn.execute(
            "SELECT count(*) FROM articles WHERE embedding IS NOT NULL"
        ).fetchone()[0]
        chunks = conn.execute("SELECT count(*) FROM chunks").fetchone()[0]
        by_source = conn.execute(
            "SELECT source, source_type, count(*) FROM articles "
            "GROUP BY 1, 2 ORDER BY 3 DESC"
        ).fetchall()
        by_theme_raw = conn.execute(
            "SELECT source_type, count(*) FROM articles GROUP BY 1"
        ).fetchall()

    theme_counts: dict[str, int] = {}
    for stype, n in by_theme_raw:
        theme_counts[THEME.get(stype, "Other")] = theme_counts.get(
            THEME.get(stype, "Other"), 0
        ) + n

    return CorpusStats(
        total=total,
        embedded=embedded,
        chunks=chunks,
        by_source=[
            {"source": s, "type": t, "theme": THEME.get(t, "Other"), "count": c}
            for s, t, c in by_source
        ],
        by_theme=[{"theme": k, "count": v} for k, v in
                  sorted(theme_counts.items(), key=lambda x: -x[1])],
    )


@router.get("/runs", response_model=list[RunRow])
def runs(limit: int = 20) -> list[RunRow]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT source, finished_at, fetched, inserted, updated, error "
            "FROM ingest_runs ORDER BY id DESC LIMIT %s",
            (limit,),
        ).fetchall()
    return [
        RunRow(
            source=s,
            finished_at=str(fin) if fin else None,
            fetched=f or 0, inserted=ins or 0, updated=upd or 0, error=err,
        )
        for s, fin, f, ins, upd, err in rows
    ]


class TriggerResult(BaseModel):
    ok: bool
    sources: list[dict]
    embedded: int


@router.post("/ingest", response_model=TriggerResult)
def trigger(
    max_results: int = 40,
    x_admin_token: str = Header(default=""),
) -> TriggerResult:
    cfg = get_settings()
    if not cfg.admin_token:
        raise HTTPException(503, "Admin trigger is disabled (ADMIN_TOKEN not set).")
    if x_admin_token != cfg.admin_token:
        raise HTTPException(401, "Invalid admin token.")

    result = pipeline.run_pipeline(max_results=max_results)
    return TriggerResult(
        ok=True,
        sources=[asdict(i) for i in result.ingests],
        embedded=result.embedded,
    )
