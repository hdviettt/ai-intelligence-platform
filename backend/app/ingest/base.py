"""Shared ingestion primitives: the Article record, dedup, upsert, and the
data-driven source registry (ingest_sources) with CRUD used by the admin panel."""
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime

from app.db import get_connection


@dataclass
class Article:
    url: str
    title: str
    source: str
    source_type: str  # paper | news | release | discussion
    summary: str | None = None
    body: str | None = None
    author: str | None = None
    published_at: datetime | None = None
    external_score: float = 0.0
    raw: dict = field(default_factory=dict)

    def content_hash(self) -> str:
        basis = f"{self.title}\n{self.summary or ''}".strip().lower()
        return hashlib.sha256(basis.encode("utf-8")).hexdigest()


@dataclass
class IngestSource:
    id: int
    name: str
    connector: str          # rss | arxiv | hackernews
    source_type: str        # paper | release | news | discussion
    config: dict
    max_results: int
    enabled: bool


VALID_CONNECTORS = {"rss", "arxiv", "hackernews"}
VALID_TYPES = {"paper", "release", "news", "discussion"}


def ensure_source(name: str, kind: str, base_url: str | None = None) -> None:
    """Register an attribution row in `sources` (used by FK on articles)."""
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sources (name, kind, base_url) VALUES (%s, %s, %s) "
            "ON CONFLICT (name) DO NOTHING",
            (name, kind, base_url),
        )
        conn.commit()


# --- ingest_sources registry (data-driven, admin-managed) ---

def _row_to_source(r) -> IngestSource:
    cfg = r[4] if isinstance(r[4], dict) else json.loads(r[4] or "{}")
    return IngestSource(
        id=r[0], name=r[1], connector=r[2], source_type=r[3],
        config=cfg, max_results=r[5], enabled=r[6],
    )


_SELECT = ("SELECT id, name, connector, source_type, config, max_results, enabled "
           "FROM ingest_sources")


def list_sources(enabled_only: bool = False) -> list[IngestSource]:
    sql = _SELECT + (" WHERE enabled" if enabled_only else "") + " ORDER BY name"
    with get_connection() as conn:
        return [_row_to_source(r) for r in conn.execute(sql).fetchall()]


def get_source(source_id: int) -> IngestSource | None:
    with get_connection() as conn:
        r = conn.execute(_SELECT + " WHERE id = %s", (source_id,)).fetchone()
    return _row_to_source(r) if r else None


def create_source(name: str, connector: str, source_type: str, config: dict,
                  max_results: int = 30, enabled: bool = True) -> IngestSource:
    with get_connection() as conn:
        r = conn.execute(
            "INSERT INTO ingest_sources (name, connector, source_type, config, "
            "max_results, enabled) VALUES (%s, %s, %s, %s, %s, %s) "
            "RETURNING id, name, connector, source_type, config, max_results, enabled",
            (name, connector, source_type, json.dumps(config), max_results, enabled),
        ).fetchone()
        conn.commit()
    return _row_to_source(r)


def update_source(source_id: int, **fields) -> IngestSource | None:
    allowed = {"name", "connector", "source_type", "config", "max_results", "enabled"}
    sets, vals = [], []
    for k, v in fields.items():
        if k not in allowed or v is None:
            continue
        sets.append(f"{k} = %s")
        vals.append(json.dumps(v) if k == "config" else v)
    if not sets:
        return get_source(source_id)
    sets.append("updated_at = now()")
    vals.append(source_id)
    with get_connection() as conn:
        r = conn.execute(
            f"UPDATE ingest_sources SET {', '.join(sets)} WHERE id = %s "
            "RETURNING id, name, connector, source_type, config, max_results, enabled",
            tuple(vals),
        ).fetchone()
        conn.commit()
    return _row_to_source(r) if r else None


def delete_source(source_id: int) -> bool:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM ingest_sources WHERE id = %s", (source_id,))
        conn.commit()
        return cur.rowcount > 0


# --- write path ---

def upsert_articles(articles: list[Article]) -> tuple[int, int]:
    """Insert new articles, update changed ones. Returns (inserted, updated)."""
    inserted = updated = 0
    with get_connection() as conn:
        for a in articles:
            row = conn.execute(
                """
                INSERT INTO articles
                    (url, title, summary, body, author, source, source_type,
                     published_at, external_score, content_hash, raw)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (url) DO UPDATE SET
                    title = EXCLUDED.title,
                    summary = EXCLUDED.summary,
                    body = COALESCE(EXCLUDED.body, articles.body),
                    external_score = EXCLUDED.external_score,
                    raw = EXCLUDED.raw
                RETURNING (xmax = 0) AS inserted
                """,
                (
                    a.url, a.title, a.summary, a.body, a.author, a.source,
                    a.source_type, a.published_at, a.external_score,
                    a.content_hash(), json.dumps(a.raw, default=str),
                ),
            ).fetchone()
            if row and row[0]:
                inserted += 1
            else:
                updated += 1
        conn.commit()
    return inserted, updated


def log_run(source: str, fetched: int, inserted: int, updated: int,
            error: str | None = None) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO ingest_runs (source, finished_at, fetched, inserted, "
            "updated, error) VALUES (%s, now(), %s, %s, %s, %s)",
            (source, fetched, inserted, updated, error),
        )
        conn.commit()
