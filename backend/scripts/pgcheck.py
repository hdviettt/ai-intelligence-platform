import os, sys

url = os.environ.get("DB_PUBLIC", "").strip()
if not url:
    print("NO_URL"); sys.exit(1)

import psycopg

with psycopg.connect(url, connect_timeout=20) as conn:
    with conn.cursor() as cur:
        cur.execute("select version();")
        print("PG:", cur.fetchone()[0][:70])
        cur.execute("select count(*) from pg_available_extensions where name='vector';")
        print("vector_available:", cur.fetchone()[0])
        cur.execute("create extension if not exists vector;")
        conn.commit()
        cur.execute("select extversion from pg_extension where extname='vector';")
        print("vector_installed:", cur.fetchone()[0])
