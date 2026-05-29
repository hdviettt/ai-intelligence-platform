"""Read-back verification: list my tables + the vector extension. No writes."""
import os
import sys

import psycopg

url = os.environ.get("DATABASE_URL", "").strip()
if not url:
    print("NO_URL"); sys.exit(1)

with psycopg.connect(url, connect_timeout=20) as conn:
    tables = conn.execute(
        "select table_name from information_schema.tables "
        "where table_schema='public' order by table_name"
    ).fetchall()
    print("TABLES:", [t[0] for t in tables])
    ext = conn.execute(
        "select extname, extversion from pg_extension where extname='vector'"
    ).fetchone()
    print("VECTOR_EXT:", ext)
    # Column check on articles to confirm the generated tsv + vector columns landed.
    cols = conn.execute(
        "select column_name, data_type from information_schema.columns "
        "where table_name='articles' and column_name in ('tsv','embedding') order by 1"
    ).fetchall()
    print("ARTICLES_KEY_COLS:", cols)
