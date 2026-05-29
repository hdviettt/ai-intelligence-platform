"""Shared ingestion primitives: the Article record, dedup, and upsert."""
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


def ensure_source(name: str, kind: str, base_url: str | None = None) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sources (name, kind, base_url)
            VALUES (%s, %s, %s)
            ON CONFLICT (name) DO NOTHING
            """,
            (name, kind, base_url),
        )
        conn.commit()


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
            """
            INSERT INTO ingest_runs
                (source, finished_at, fetched, inserted, updated, error)
            VALUES (%s, now(), %s, %s, %s, %s)
            """,
            (source, fetched, inserted, updated, error),
        )
        conn.commit()
