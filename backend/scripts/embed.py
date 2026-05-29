"""Backfill embeddings for any article whose embedding is NULL. Idempotent.

Thin CLI wrapper around app.pipeline.embed_pending so there's one code path.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.pipeline import embed_pending  # noqa: E402


def main() -> None:
    n = embed_pending()
    print(f"Embedded {n} article(s)." if n else "Nothing to embed.")


if __name__ == "__main__":
    main()
