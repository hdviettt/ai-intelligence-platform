"""Generate and store the latest briefing. Run by cron after ingest, or by hand.

Usage:
    python scripts/brief.py            # daily
    python scripts/brief.py weekly     # weekly
"""
import sys
from pathlib import Path

# Allow running as `python scripts/brief.py` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import briefing  # noqa: E402


def main() -> None:
    kind = sys.argv[1] if len(sys.argv) > 1 else "daily"
    briefing.ensure_schema()
    b = briefing.generate_and_save(kind=kind)
    print(f"[{kind}] {b.article_count} sources · provider={b.provider} · {len(b.narrative)} chars")
    if not b.citations:
        print("(nothing to brief — no fresh articles in the window)")


if __name__ == "__main__":
    main()
