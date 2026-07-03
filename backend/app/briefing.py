"""Daily/weekly intelligence briefing — one flowing narrative of what's new in AI
plus what it MEANS, grounded in the recent corpus with [n] citations.

Unlike per-article scoring (thousands of LLM calls -> rate limits), a briefing is a
SINGLE LLM call over the most recent, highest-signal articles. So it runs cheaply and
isn't blocked by the scoring backlog. Selection prefers precomputed signal where it
exists and otherwise falls back to plain recency, so it works today at 0% scoring.
"""
import json
from dataclasses import dataclass
from pathlib import Path

from app.config import get_settings
from app.db import get_connection
from app.discovery import theme_for

DEFAULT_DAYS = {"daily": 4, "weekly": 10}
DEFAULT_LIMIT = 18

SYSTEM = (
    "You are the analyst behind a personal AI-intelligence briefing for a sharp "
    "reader who wants to stay ahead of the field and never fall behind. Using ONLY "
    "the numbered sources provided, write ONE flowing briefing — a single connected "
    "narrative, not a list — that tells the story of what's new and, crucially, what "
    "it MEANS: the through-line, the implications, and what to watch next. Open with "
    "the single biggest thread. Prioritize substantive developments — model and "
    "product releases, research that changes something, notable industry or policy "
    "moves — over minor items, personal projects, or incremental preprints; simply "
    "leave the trivia out. If the window is genuinely thin on major news, say so "
    "plainly rather than inflating small items. Be concrete and specific; name the "
    "players. Cite every claim with bracketed numbers like [1], [2]. Where sources "
    "disagree or a claim is thin, say so instead of smoothing it over. Never invent "
    "anything not in the sources. Aim for 350-450 words across 3-5 short paragraphs. "
    "No headings, no bullet lists, no preamble like 'Here is the briefing' — just the "
    "narrative itself."
)


@dataclass
class Citation:
    n: int
    article_id: int
    title: str
    url: str
    source: str


@dataclass
class Briefing:
    kind: str
    narrative: str
    citations: list[Citation]
    window_start: object | None
    window_end: object | None
    article_count: int
    provider: str
    generated_at: object | None = None


def ensure_schema() -> None:
    """Apply the briefings migration if the table isn't there yet. Lets the admin
    trigger work on a fresh prod DB without a separate migrate step (idempotent)."""
    sql = (Path(__file__).resolve().parents[1] / "migrations" / "008_briefings.sql").read_text(
        encoding="utf-8"
    )
    with get_connection() as conn:
        conn.execute(sql)
        conn.commit()


def _select_articles(days: int, limit: int) -> list[tuple]:
    """Recent articles, best-signal first where scored, else quality-weighted recency.

    With scoring off (signal all 0), pure recency just grabs whatever was ingested
    last — usually raw arXiv preprints and low-effort discussion. So the fallback
    demotes papers and promotes releases/news, then breaks ties by engagement
    (HN points) and recency. A LEFT JOIN on max persona signal still leads when the
    corpus is scored, so this only gets better as scoring comes online.
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
        cites.append(Citation(i, aid, title, url, source))
        ats.append(at)
        body = (summary or "").strip()
        blocks.append(f"[{i}] {title} — {source} ({theme_for(stype)})\n{body}")
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
            {"role": "user", "content": f"Time span: {span}\n\nSources:\n{context}\n\nWrite the briefing."},
        ],
        temperature=0.4,
    )
    return resp.choices[0].message.content.strip()


def _ask_anthropic(context: str, span: str) -> str:
    import anthropic

    cfg = get_settings()
    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=1200,
        system=SYSTEM,
        messages=[{"role": "user", "content": f"Time span: {span}\n\nSources:\n{context}\n\nWrite the briefing."}],
    )
    return "".join(b.text for b in msg.content if b.type == "text").strip()


def generate(kind: str = "daily", days: int | None = None, limit: int = DEFAULT_LIMIT) -> Briefing:
    days = days or DEFAULT_DAYS.get(kind, 3)
    rows = _select_articles(days, limit)
    if not rows:
        return Briefing(kind, "No fresh sources in the window yet.", [], None, None, 0, "none")
    context, cites, ws, we = _build_context(rows)
    provider = get_settings().synthesis_provider
    span = f"last {days} days"
    narrative = _ask_anthropic(context, span) if provider == "anthropic" else _ask_groq(context, span)
    return Briefing(kind, narrative, cites, ws, we, len(cites), provider)


def save(b: Briefing) -> int:
    payload = json.dumps(
        [{"n": c.n, "article_id": c.article_id, "title": c.title, "url": c.url, "source": c.source}
         for c in b.citations]
    )
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO briefings
                (kind, narrative, citations, window_start, window_end, article_count, provider)
            VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s)
            RETURNING id
            """,
            (b.kind, b.narrative, payload, b.window_start, b.window_end, b.article_count, b.provider),
        ).fetchone()
        conn.commit()
    return row[0]


def latest(kind: str = "daily") -> Briefing | None:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT kind, narrative, citations, window_start, window_end,
                   article_count, provider, generated_at
            FROM briefings WHERE kind = %s ORDER BY generated_at DESC LIMIT 1
            """,
            (kind,),
        ).fetchone()
    if not row:
        return None
    kind, narrative, cites_json, ws, we, count, provider, gen = row
    data = cites_json if isinstance(cites_json, list) else []
    cites = [
        Citation(c["n"], c.get("article_id", 0), c["title"], c["url"], c["source"]) for c in data
    ]
    return Briefing(kind, narrative, cites, ws, we, count, provider, gen)


def generate_and_save(kind: str = "daily", days: int | None = None, limit: int = DEFAULT_LIMIT) -> Briefing:
    b = generate(kind, days, limit)
    if b.citations:  # never persist an empty / failed briefing
        save(b)
    return b
