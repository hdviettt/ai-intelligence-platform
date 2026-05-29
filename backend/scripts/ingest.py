"""Run ingestion for configured sources (from the ingest_sources table).

Usage:
    python scripts/ingest.py                 # all enabled sources
    python scripts/ingest.py --only arxiv,import-ai
    python scripts/ingest.py --max 40        # override max_results per source
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.pipeline import run_ingest  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="", help="comma-separated source names")
    parser.add_argument("--max", type=int, default=None, help="override max_results")
    args = parser.parse_args()

    names = [s.strip() for s in args.only.split(",") if s.strip()] or None
    results = run_ingest(names=names, max_override=args.max)
    total_i = sum(r.inserted for r in results)
    print(f"TOTAL sources={len(results)} inserted={total_i}")


if __name__ == "__main__":
    main()
