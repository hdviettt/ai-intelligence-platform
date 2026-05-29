"""Apply SQL migrations in order. Idempotent — every migration uses IF NOT EXISTS."""
import sys
from pathlib import Path

# Allow running as `python scripts/migrate.py` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import get_connection  # noqa: E402

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"


def main() -> None:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        print("No migrations found.")
        return
    with get_connection() as conn:
        for f in files:
            print(f"Applying {f.name} ...")
            conn.execute(f.read_text(encoding="utf-8"))
        conn.commit()
    print(f"Done. Applied {len(files)} migration(s).")


if __name__ == "__main__":
    main()
