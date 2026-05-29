"""Per-source corpus breakdown — read-only."""
import os
import sys

import psycopg

url = os.environ.get("DATABASE_URL", "").strip()
if not url:
    print("NO_URL"); sys.exit(1)

with psycopg.connect(url, connect_timeout=20) as conn:
    total = conn.execute("select count(*) from articles").fetchone()[0]
    embedded = conn.execute(
        "select count(*) from articles where embedding is not null"
    ).fetchone()[0]
    chunks = conn.execute("select count(*) from chunks").fetchone()[0]
    print(f"TOTAL={total}  EMBEDDED={embedded}  CHUNKS={chunks}")
    print("\nBY SOURCE:")
    rows = conn.execute(
        "select source, source_type, count(*) from articles "
        "group by 1,2 order by 3 desc"
    ).fetchall()
    for src, st, n in rows:
        print(f"  {n:4}  {src:16} ({st})")
