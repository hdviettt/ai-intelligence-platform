"""Run one or all ingestion connectors.

Usage:
    python scripts/ingest.py arxiv [--max 50]
    python scripts/ingest.py all
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ingest import arxiv, hackernews  # noqa: E402

SOURCES = {
    "arxiv": arxiv.run,
    "hackernews": hackernews.run,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", choices=[*SOURCES, "all"])
    parser.add_argument("--max", type=int, default=50)
    args = parser.parse_args()

    targets = SOURCES.values() if args.source == "all" else [SOURCES[args.source]]
    for run in targets:
        run(max_results=args.max)


if __name__ == "__main__":
    main()
