"""Daily/weekly intelligence briefing — a STRUCTURED read on what's new in AI plus
what it means, grounded in the recent corpus.

Rather than a wall of prose, a briefing is organised like Google's Web Guide: a short
lede naming the day's through-line, then a few themed threads. Each thread has an
AI-written heading + "so what" description and groups the real source articles that
belong to it (rendered as cards with title, snippet, source, date).

Still a SINGLE LLM call over the most recent, highest-signal articles, so it's cheap
and isn't blocked by the per-article scoring backlog. Selection prefers precomputed
signal where it exists and otherwise falls back to quality-weighted recency.
"""
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from app.config import get_settings
from app.db import get_connection
from app.discovery import theme_for

DEFAULT_DAYS = {"daily": 4, "weekly": 10}
DEFAULT_LIMIT = 18
_MIGRATIONS = ("008_briefings.sql", "009_briefing_structure.sql")

SYSTEM = (
    "You are the analyst behind a personal AI-intelligence briefing for a sharp reader "
    "who wants to stay ahead of the field and never fall behind. From the numbered "
    "sources, produce a STRUCTURED briefing that organises the day into a few clear "
    "themes (like Google's Web Guide) — NOT a wall of prose.\n\n"
    "Return ONLY valid JSON of this exact shape:\n"
    '{\n'
    '  "lede": "<one sentence naming the single biggest through-line right now>",\n'
    '  "threads": [\n'
    '    {\n'
    '      "title": "<3-6 word theme heading>",\n'
    '      "summary": "<1-2 sentences: what this theme is and, crucially, why it '
    'matters — the so-what>",\n'
    '      "sources": [<source numbers belonging to this theme>]\n'
    '    }\n'
    '  ]\n'
    '}\n\n'
    "Rules:\n"
    "- The lede must name the single biggest CONCRETE story or tension right now "
    "(who did what, and the stakes) — never a generic filler like 'AI is evolving "
    "rapidly' or 'significant developments'.\n"
    "- 3 to 5 threads, ordered most to least important.\n"
    "- Prioritise substantive developments (model/product releases, research that "
    "changes something, notable industry or policy moves) over trivia, personal "
    "projects, or incremental preprints — simply leave the trivia out.\n"
    "- Every thread must cite at least one real source number from the list; never "
    "invent a number. A source may appear in at most one thread; not every source "
    "must be used.\n"
    "- Be concrete and specific; name the players. No markdown and no citation "
    "brackets inside the text — the sources array carries the links.\n"
    "- If the window is genuinely thin on real news, say so honestly in the lede and "
    "use fewer threads."
)


@dataclass
class Citation:
    n: int
    article_id: int
    title: str
    url: str
    source: str
    snippet: str | None = None
    published_at: str | None = None


@dataclass
class Thread:
    title: str
    summary: str
    sources: list[int] = field(default_factory=list)


@dataclass
class Briefing:
    kind: str
    lede: str
    threads: list[Thread]
    citations: list[Citation]
    window_start: object | None
    window_end: object | None
    article_count: int
    provider: str
    narrative: str = ""            # plaintext fallback for the legacy column / old clients
    generated_at: object | None = None


def ensure_schema() -> None:
    """Apply the briefing migrations if missing — lets the admin trigger and cron work
    on a fresh prod DB without a separate migrate step (idempotent)."""
    mig = Path(__file__).resolve().parents[1] / "migrations"
    with get_connection() as conn:
        for name in _MIGRATIONS:
            conn.execute((mig / name).read_text(encoding="utf-8"))
        conn.commit()


def _select_articles(days: int, limit: int) -> list[tuple]:
    """Recent articles, best-signal first where scored, else quality-weighted recency.

    With scoring off (signal all 0), pure recency just grabs whatever was ingested
    last — usually raw arXiv preprints and low-effort discussion. So the fallback
    demotes papers and promotes releases/news, then breaks ties by engagement (HN
    points) and recency. Signal still leads once the corpus is scored.
    """
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT a.id, a.title, a.summary, a.url, a.source, a.source_type,
                   COALESCE(a.published_at, a.fetched_at) AS at,
                   COALESCE(a.substance, 0) AS substance,
                   COALESCE(ms.max_signal, 0) AS signal
            FROM articles a
            LEFT JOIN (
                SELECT article_id, max(signal) AS max_signal
                FROM article_persona_scores GROUP BY article_id
            ) ms ON ms.article_id = a.id
            WHERE COALESCE(a.published_at, a.fetched_at) > now() - (%s || ' days')::interval
            ORDER BY
                ms.max_signal DESC NULLS LAST,
                CASE a.source_type
                    WHEN 'release' THEN 2
                    WHEN 'news' THEN 2
                    WHEN 'discussion' THEN 1
                    ELSE 0                       -- papers (arXiv) sink to the tail
                END DESC,
                COALESCE(a.external_score, 0) DESC,
                COALESCE(a.published_at, a.fetched_at) DESC
            LIMIT %s
            """,
            (days, limit),
        ).fetchall()


def _build_context(rows: list[tuple]) -> tuple[str, list[Citation], object, object]:
    blocks: list[str] = []
    cites: list[Citation] = []
    ats: list = []
    for i, (aid, title, summary, url, source, stype, at, _sub, _sig) in enumerate(rows, 1):
        snippet = (summary or "").strip()
        cites.append(
            Citation(
                n=i, article_id=aid, title=title, url=url, source=source,
                snippet=snippet[:220] or None,
                published_at=str(at) if at else None,
            )
        )
        ats.append(at)
        blocks.append(f"[{i}] {title} — {source} ({theme_for(stype)})\n{snippet[:320]}")
    window_start = min(ats) if ats else None
    window_end = max(ats) if ats else None
    return "\n\n".join(blocks), cites, window_start, window_end


def _ask_groq(context: str, span: str) -> str:
    from groq import Groq

    cfg = get_settings()
    client = Groq(api_key=cfg.groq_api_key)
    resp = client.chat.completions.create(
        model=cfg.groq_model,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Time span: {span}\n\nSources:\n{context}\n\nReturn the JSON briefing."},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content


def _ask_anthropic(context: str, span: str) -> str:
    import anthropic

    cfg = get_settings()
    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=1400,
        system=SYSTEM + "\n\nRespond with the raw JSON object only.",
        messages=[{"role": "user", "content": f"Time span: {span}\n\nSources:\n{context}\n\nReturn the JSON briefing."}],
    )
    return "".join(b.text for b in msg.content if b.type == "text")


def _parse_json(raw: str) -> dict:
    raw = (raw or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()
    try:
        return json.loads(raw)
    except Exception:  # noqa: BLE001
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:  # noqa: BLE001
                return {}
        return {}


def _validate_threads(items, valid_ns: set[int]) -> list[Thread]:
    out: list[Thread] = []
    used: set[int] = set()
    for t in items or []:
        if not isinstance(t, dict):
            continue
        title = str(t.get("title", "")).strip()
        summary = str(t.get("summary", "")).strip()
        srcs: list[int] = []
        for x in t.get("sources") or []:
            try:
                n = int(x)
            except (TypeError, ValueError):
                continue
            if n in valid_ns and n not in used:
                srcs.append(n)
                used.add(n)
        if title and srcs:
            out.append(Thread(title=title, summary=summary, sources=srcs))
    return out[:6]


def _fallback_narrative(lede: str, threads: list[Thread]) -> str:
    parts = [lede] if lede else []
    parts += [f"{t.title}: {t.summary}".strip() for t in threads]
    return "\n\n".join(p for p in parts if p) or "No briefing available."


def generate(kind: str = "daily", days: int | None = None, limit: int = DEFAULT_LIMIT) -> Briefing:
    days = days or DEFAULT_DAYS.get(kind, 4)
    rows = _select_articles(days, limit)
    if not rows:
        return Briefing(kind, "No fresh sources in the window yet.", [], [], None, None, 0, "none")
    context, cites, ws, we = _build_context(rows)
    provider = get_settings().synthesis_provider
    span = f"last {days} days"
    raw = _ask_anthropic(context, span) if provider == "anthropic" else _ask_groq(context, span)
    data = _parse_json(raw)
    lede = str(data.get("lede", "")).strip()
    threads = _validate_threads(data.get("threads"), {c.n for c in cites})
    narrative = _fallback_narrative(lede, threads)
    return Briefing(kind, lede, threads, cites, ws, we, len(cites), provider, narrative=narrative)


def save(b: Briefing) -> int:
    threads_json = json.dumps(
        [{"title": t.title, "summary": t.summary, "sources": t.sources} for t in b.threads]
    )
    cites_json = json.dumps(
        [{"n": c.n, "article_id": c.article_id, "title": c.title, "url": c.url,
          "source": c.source, "snippet": c.snippet, "published_at": c.published_at}
         for c in b.citations]
    )
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO briefings
                (kind, narrative, citations, lede, threads,
                 window_start, window_end, article_count, provider)
            VALUES (%s, %s, %s::jsonb, %s, %s::jsonb, %s, %s, %s, %s)
            RETURNING id
            """,
            (b.kind, b.narrative, cites_json, b.lede, threads_json,
             b.window_start, b.window_end, b.article_count, b.provider),
        ).fetchone()
        conn.commit()
    return row[0]


def latest(kind: str = "daily") -> Briefing | None:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT kind, narrative, citations, lede, threads, window_start, window_end,
                   article_count, provider, generated_at
            FROM briefings WHERE kind = %s ORDER BY generated_at DESC LIMIT 1
            """,
            (kind,),
        ).fetchone()
    if not row:
        return None
    (kind, narrative, cites_json, lede, threads_json, ws, we, count, provider, gen) = row
    cites = [
        Citation(
            n=c["n"], article_id=c.get("article_id", 0), title=c["title"], url=c["url"],
            source=c["source"], snippet=c.get("snippet"), published_at=c.get("published_at"),
        )
        for c in (cites_json if isinstance(cites_json, list) else [])
    ]
    threads = [
        Thread(title=t.get("title", ""), summary=t.get("summary", ""), sources=t.get("sources", []))
        for t in (threads_json if isinstance(threads_json, list) else [])
    ]
    return Briefing(kind, lede or "", threads, cites, ws, we, count, provider,
                    narrative=narrative or "", generated_at=gen)


def generate_and_save(kind: str = "daily", days: int | None = None, limit: int = DEFAULT_LIMIT) -> Briefing:
    b = generate(kind, days, limit)
    if b.threads or b.lede:  # never persist an empty / failed briefing
        save(b)
    return b
