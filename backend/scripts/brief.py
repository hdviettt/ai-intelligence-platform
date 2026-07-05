"""Generate and store the latest briefing. Run by cron after ingest, or by hand.

Non-fatal by design: the briefing is a nice-to-have layered on top of ingestion,
so any failure here (a missing synthesis key, a provider hiccup) is logged and
swallowed — it must NEVER fail the ingestion cron. Exits 0 unless run with
--strict (for CI/manual debugging). The caught error is printed so it shows up
in the cron logs.

Usage:
    python scripts/brief.py                  # daily
    python scripts/brief.py weekly           # weekly
    python scripts/brief.py daily --strict   # exit non-zero on failure
"""
import sys
from pathlib import Path

# Allow running as `python scripts/brief.py` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import briefing  # noqa: E402


def main() -> int:
    strict = "--strict" in sys.argv
    positional = [a for a in sys.argv[1:] if not a.startswith("-")]
    kind = positional[0] if positional else "daily"
    try:
        briefing.ensure_schema()
        b = briefing.generate_and_save(kind=kind)
        print(f"[brief:{kind}] {b.article_count} sources · provider={b.provider} · {len(b.narrative)} chars")
        if not b.citations:
            print("[brief] nothing to brief — no fresh articles in the window")
    except Exception as exc:  # noqa: BLE001 — never fail the ingestion cron
        print(f"[brief] SKIPPED — generation failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1 if strict else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
