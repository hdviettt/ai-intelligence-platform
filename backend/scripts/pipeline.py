"""One-shot ingest + embed. Entry point for the scheduled cron service.

Runs all connectors, embeds new articles, prints a summary, exits. Designed to be
run by Railway cron (process must exit when done).

Usage:
    python scripts/pipeline.py [--max 50] [--sources arxiv,rss]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.pipeline import run_pipeline  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=50)
    parser.add_argument("--sources", default="", help="comma-separated; default all")
    args = parser.parse_args()

    sources = [s.strip() for s in args.sources.split(",") if s.strip()] or None
    result = run_pipeline(sources=sources, max_results=args.max)

    print("=== ingest ===")
    for r in result.ingests:
        status = "ok" if r.error is None else f"ERROR {r.error[:100]}"
        print(f"  {r.source:12} fetched={r.fetched} inserted={r.inserted} "
              f"updated={r.updated} {status}")
    print(f"=== embedded {result.embedded} new article(s) ===")
    print(f"TOTAL fetched={result.total_fetched} inserted={result.total_inserted} "
          f"embedded={result.embedded}")

    # Non-zero exit if every source errored, so cron surfaces a real failure.
    if result.ingests and all(r.error for r in result.ingests):
        sys.exit(1)


if __name__ == "__main__":
    main()
