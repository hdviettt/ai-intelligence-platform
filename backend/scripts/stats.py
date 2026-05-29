"""Quick corpus stats — read-only."""
import os
import sys

import psycopg

url = os.environ.get("DATABASE_URL", "").strip()
if not url:
    print("NO_URL"); sys.exit(1)

with psycopg.connect(url, connect_timeout=20) as conn:
    total = conn.execute("select count(*) from articles").fetchone()[0]
    print("ARTICLES_TOTAL:", total)
    by_type = conn.execute(
        "select source_type, count(*) from articles group by 1 order by 2 desc"
    ).fetchall()
    print("BY_TYPE:", by_type)
    embedded = conn.execute(
        "select count(*) from articles where embedding is not null"
    ).fetchone()[0]
    print("ARTICLES_EMBEDDED:", embedded)
    chunks = conn.execute("select count(*) from chunks").fetchone()[0]
    print("CHUNKS_TOTAL:", chunks)
    sample = conn.execute(
        "select source_type, left(title, 64) from articles "
        "order by published_at desc nulls last limit 3"
    ).fetchall()
    for st, t in sample:
        print(f"  [{st}] {t}")
