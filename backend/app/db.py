"""Postgres connection pool (psycopg3) with pgvector registered."""
from contextlib import contextmanager

from psycopg_pool import ConnectionPool
from pgvector.psycopg import register_vector

from app.config import get_settings

_pool: ConnectionPool | None = None


def _configure(conn) -> None:
    register_vector(conn)


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        url = get_settings().database_url
        if not url:
            raise RuntimeError("DATABASE_URL is not set")
        _pool = ConnectionPool(
            conninfo=url,
            min_size=1,
            max_size=10,
            configure=_configure,
            open=True,
        )
    return _pool


@contextmanager
def get_connection():
    pool = get_pool()
    with pool.connection() as conn:
        yield conn
