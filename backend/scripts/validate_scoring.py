"""Quality gate before any backfill. Pulls a DIVERSE sample (across sources/themes),
enriches thin ones, scores them, and prints a readable table for human eyeball
review. Writes scores to the DB (idempotent/resumable) but only for the sample.

Usage: python scripts/validate_scoring.py [N_per_theme]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.db import get_connection  # noqa: E402
from app.enrich import enrich_one  # noqa: E402
from app.personas import list_personas  # noqa: E402
from app.scoring import _hype_gap, _judge, persona_signal  # noqa: E402


def main() -> None:
    per = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    cfg = get_settings()
    personas = list_personas()

    # Diverse sample: top-N by engagement within each source_type.
    with get_connection() as conn:
        max_eng = conn.execute(
            "SELECT COALESCE(max(external_score),1) FROM articles"
        ).fetchone()[0] or 1
        rows = conn.execute(
            """
            SELECT id, title, summary, body, source, source_type, external_score
            FROM (
              SELECT *, row_number() OVER (
                PARTITION BY source_type ORDER BY external_score DESC, id DESC
              ) rn FROM articles
            ) t WHERE rn <= %s ORDER BY source_type, external_score DESC
            """,
            (per,),
        ).fetchall()

    print(f"Sampling {len(rows)} articles across themes. Scoring…\n")
    results = []
    for aid, title, summary, body, source, stype, eng in rows:
        text = body or summary or ""
        enriched = ""
        if len(text) < 200:
            with get_connection() as conn:
                url = conn.execute(
                    "SELECT url FROM articles WHERE id=%s", (aid,)
                ).fetchone()[0]
            fetched = enrich_one(url, cfg)
            if fetched:
                text = fetched
                enriched = " [enriched]"
        text = text[:4000]
        try:
            sc = _judge(title or "", text, personas)
        except Exception as exc:  # noqa: BLE001
            print(f"  skip {aid}: {type(exc).__name__}")
            continue
        gap = _hype_gap(float(eng or 0), sc.substance, float(max_eng))
        ceo = sc.personas.get("ceo", {}) or {}
        results.append((stype, source, title, sc, gap, ceo, eng, enriched))

    # Sort by the real persona_signal (relevance-led, substance-demoted), recency=1
    # for the validation view so we judge the lens, not the clock.
    results.sort(
        key=lambda r: persona_signal(
            r[3].substance, float(r[5].get("relevance", 0) or 0), 1.0
        ),
        reverse=True,
    )

    print("=" * 100)
    print("RANKED BY CEO SIGNAL (relevance-led, substance-demoted) — does this order match your judgment?\n")
    for stype, source, title, sc, gap, ceo, eng, enr in results:
        rel = float(ceo.get("relevance", 0) or 0)
        sig = persona_signal(sc.substance, rel, 1.0)
        gap_s = f"{gap:+5.1f}" if gap is not None else "  n/a"
        print(f"[{sig:5.1f}] sub={sc.substance:4.1f} ceo_rel={rel:4.1f} "
              f"hype_gap={gap_s} eng={int(eng or 0):4d} | {stype:10} {source}{enr}")
        print(f"        {(title or '')[:84]}")
        print(f"        n={sc.novelty:.0f} ev={sc.evidence:.0f} sp={sc.specificity:.0f} "
              f"hype={sc.hype_markers:.0f}  →  {(ceo.get('angle') or '')[:96]}")
        print()


if __name__ == "__main__":
    main()
