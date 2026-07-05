"""Generate and store a fresh briefing per persona. Run by cron after ingest, or by
hand.

Non-fatal by design: the briefing is a nice-to-have layered on top of ingestion, so
any failure (a missing synthesis key, a provider hiccup) is logged and swallowed — it
must NEVER fail the ingestion cron. Exits 0 unless run with --strict.

Usage:
    python scripts/brief.py                    # daily, every enabled persona
    python scripts/brief.py weekly             # weekly, every enabled persona
    python scripts/brief.py daily --strict     # exit non-zero on failure
"""
import sys
from pathlib import Path

# Allow running as `python scripts/brief.py` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import briefing, personas  # noqa: E402


def main() -> int:
    strict = "--strict" in sys.argv
    positional = [a for a in sys.argv[1:] if not a.startswith("-")]
    kind = positional[0] if positional else "daily"
    try:
        briefing.ensure_schema()
        keys = [p.key for p in personas.list_personas(enabled_only=True)] or ["ceo"]
        for key in keys:
            b = briefing.generate_and_save(kind=kind, persona=key)
            note = "" if b.threads else " (nothing to brief)"
            print(f"[brief:{kind}:{key}] {len(b.threads)} threads · "
                  f"{b.article_count} sources · provider={b.provider}{note}")
    except Exception as exc:  # noqa: BLE001 — never fail the ingestion cron
        print(f"[brief] SKIPPED — generation failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1 if strict else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
