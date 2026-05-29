"""Smoke test: hybrid retrieval + cited synthesis on a real query."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import retrieval, synthesis  # noqa: E402

QUERY = sys.argv[1] if len(sys.argv) > 1 else "agentic LLM reasoning"


def main() -> None:
    print(f"QUERY: {QUERY}\n--- RETRIEVAL ---")
    results = retrieval.search(QUERY, limit=5)
    for r in results:
        print(f"{r.score:.4f} | {r.source_type:10} | {r.title[:66]}")

    print("\n--- OVERVIEW ---")
    ov = synthesis.overview(QUERY)
    print(f"provider: {ov.provider}")
    print(ov.answer[:900])
    print("\nCITATIONS:")
    for c in ov.citations:
        print(f"  [{c.n}] {c.source}: {c.title[:60]}")


if __name__ == "__main__":
    main()
