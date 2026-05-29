"""Admin/control endpoints: corpus stats, source health, source CRUD, ingest.

Read endpoints are open (no secrets, no writes). Every write (source CRUD and the
ingest trigger) requires a shared-secret token AND is disabled entirely unless
ADMIN_TOKEN is configured. Full login auth comes before any public launch.
"""
from dataclasses import asdict

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app import pipeline
from app.config import get_settings
from app.db import get_connection
from app.ingest import base

router = APIRouter(prefix="/admin", tags=["admin"])

THEME = {"paper": "Research", "release": "Releases", "news": "News",
         "discussion": "Discussion"}


def _require_admin(token: str) -> None:
    cfg = get_settings()
    if not cfg.admin_token:
        raise HTTPException(503, "Admin writes are disabled (ADMIN_TOKEN not set).")
    if token != cfg.admin_token:
        raise HTTPException(401, "Invalid admin token.")


# --- stats & health (open) ---

class CorpusStats(BaseModel):
    total: int
    embedded: int
    chunks: int
    by_source: list[dict]
    by_theme: list[dict]


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
        key = THEME.get(stype, "Other")
        theme_counts[key] = theme_counts.get(key, 0) + n

    return CorpusStats(
        total=total, embedded=embedded, chunks=chunks,
        by_source=[{"source": s, "type": t, "theme": THEME.get(t, "Other"),
                    "count": c} for s, t, c in by_source],
        by_theme=[{"theme": k, "count": v} for k, v in
                  sorted(theme_counts.items(), key=lambda x: -x[1])],
    )


class RunRow(BaseModel):
    source: str
    finished_at: str | None
    fetched: int
    inserted: int
    updated: int
    error: str | None


@router.get("/runs", response_model=list[RunRow])
def runs(limit: int = 20) -> list[RunRow]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT source, finished_at, fetched, inserted, updated, error "
            "FROM ingest_runs ORDER BY id DESC LIMIT %s", (limit,),
        ).fetchall()
    return [
        RunRow(source=s, finished_at=str(fin) if fin else None,
               fetched=f or 0, inserted=ins or 0, updated=upd or 0, error=err)
        for s, fin, f, ins, upd, err in rows
    ]


# --- source registry (read open; writes token-gated) ---

class SourceOut(BaseModel):
    id: int
    name: str
    connector: str
    source_type: str
    config: dict
    max_results: int
    enabled: bool


class SourceIn(BaseModel):
    name: str
    connector: str
    source_type: str
    config: dict = {}
    max_results: int = 30
    enabled: bool = True


class SourcePatch(BaseModel):
    name: str | None = None
    connector: str | None = None
    source_type: str | None = None
    config: dict | None = None
    max_results: int | None = None
    enabled: bool | None = None


def _src_out(s: base.IngestSource) -> SourceOut:
    return SourceOut(**asdict(s))


def _validate(connector: str | None, source_type: str | None) -> None:
    if connector is not None and connector not in base.VALID_CONNECTORS:
        raise HTTPException(422, f"connector must be one of {sorted(base.VALID_CONNECTORS)}")
    if source_type is not None and source_type not in base.VALID_TYPES:
        raise HTTPException(422, f"source_type must be one of {sorted(base.VALID_TYPES)}")


@router.get("/sources", response_model=list[SourceOut])
def list_sources() -> list[SourceOut]:
    return [_src_out(s) for s in base.list_sources()]


@router.post("/sources", response_model=SourceOut)
def create_source(body: SourceIn, x_admin_token: str = Header(default="")) -> SourceOut:
    _require_admin(x_admin_token)
    _validate(body.connector, body.source_type)
    try:
        s = base.create_source(
            name=body.name, connector=body.connector, source_type=body.source_type,
            config=body.config, max_results=body.max_results, enabled=body.enabled,
        )
    except Exception as exc:  # noqa: BLE001 — e.g. duplicate name
        raise HTTPException(409, f"could not create source: {exc}")
    return _src_out(s)


@router.patch("/sources/{source_id}", response_model=SourceOut)
def update_source(source_id: int, body: SourcePatch,
                  x_admin_token: str = Header(default="")) -> SourceOut:
    _require_admin(x_admin_token)
    _validate(body.connector, body.source_type)
    s = base.update_source(source_id, **body.model_dump(exclude_none=True))
    if not s:
        raise HTTPException(404, "source not found")
    return _src_out(s)


@router.delete("/sources/{source_id}")
def delete_source(source_id: int, x_admin_token: str = Header(default="")) -> dict:
    _require_admin(x_admin_token)
    if not base.delete_source(source_id):
        raise HTTPException(404, "source not found")
    return {"ok": True}


# --- ingest trigger (token-gated, configurable) ---

class TriggerIn(BaseModel):
    sources: list[str] | None = None   # source names; None = all enabled
    max_results: int | None = None     # override per-source max


class TriggerResult(BaseModel):
    ok: bool
    sources: list[dict]
    embedded: int


@router.post("/ingest", response_model=TriggerResult)
def trigger(body: TriggerIn | None = None,
            x_admin_token: str = Header(default="")) -> TriggerResult:
    _require_admin(x_admin_token)
    body = body or TriggerIn()
    result = pipeline.run_pipeline(names=body.sources, max_override=body.max_results)
    return TriggerResult(
        ok=True,
        sources=[asdict(i) for i in result.ingests],
        embedded=result.embedded,
    )
