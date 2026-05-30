"""Enrich thin articles, then score the corpus — paced and resumable.

Safe to stop/restart: enrichment marks tried items, scoring only touches
scored_at IS NULL. Prints progress. Entry point for the one-time backfill and
re-usable by cron.

Usage: python scripts/backfill_scores.py [--limit N] [--no-enrich]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import get_connection  # noqa: E402
from app.enrich import enrich_pending  # noqa: E402
from app.scoring import score_pending  # noqa: E402


def _counts() -> tuple[int, int]:
    with get_connection() as conn:
        total = conn.execute("SELECT count(*) FROM articles").fetchone()[0]
        scored = conn.execute(
            "SELECT count(*) FROM articles WHERE scored_at IS NOT NULL"
        ).fetchone()[0]
    return total, scored


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--no-enrich", action="store_true")
    args = ap.parse_args()

    total, scored = _counts()
    print(f"start: {scored}/{total} scored, {total - scored} pending")

    if not args.no_enrich:
        print("enriching thin articles (HTTP-only, no API cost)…")
        attempted, enriched = enrich_pending(limit=args.limit)
        print(f"  enriched {enriched}/{attempted}")

    print("scoring (recent first, paced)…")
    n = score_pending(limit=args.limit, order="recent")
    total, scored = _counts()
    print(f"done: scored {n} this run; {scored}/{total} total scored")


if __name__ == "__main__":
    main()
