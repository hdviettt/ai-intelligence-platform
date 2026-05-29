"""Show the most recent ingest runs — read-only. Ground truth for cron health."""
import os
import sys

import psycopg

url = os.environ.get("DATABASE_URL", "").strip()
if not url:
    print("NO_URL"); sys.exit(1)

with psycopg.connect(url, connect_timeout=20) as conn:
    rows = conn.execute(
        "SELECT source, started_at, finished_at, fetched, inserted, updated, error "
        "FROM ingest_runs ORDER BY id DESC LIMIT 12"
    ).fetchall()
    print(f"{'source':14} {'finished_at':22} fetch ins upd  error")
    for src, started, fin, f, ins, upd, err in rows:
        ts = str(fin)[:19] if fin else "(running)"
        print(f"{src:14} {ts:22} {f or 0:5} {ins or 0:3} {upd or 0:3}  {err or ''}")
