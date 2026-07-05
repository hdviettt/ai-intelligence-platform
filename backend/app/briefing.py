"""Daily/weekly intelligence briefing — a STRUCTURED, PERSONA-ANCHORED read on
what's new in AI plus what it means for a specific reader.

Each briefing is written through one persona's lens (a CEO's brief reads differently
from a developer's): the lede and every thread's "so what" are framed around what
THAT reader should notice, decide, or watch. Organised like Google's Web Guide — a
lede, then a few themed threads, each grouping the real source articles under an
AI-written heading + description.

Still a SINGLE LLM call over the most recent, highest-signal articles, so it's cheap
and isn't blocked by the per-article scoring backlog. Selection prefers precomputed
signal where it exists and otherwise falls back to quality-weighted recency; the
persona LENS (framing) applies today, while persona-tailored SELECTION arrives with
scoring.
"""
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from app import personas
from app.config import get_settings
from app.db import get_connection
from app.discovery import theme_for

# Wider candidate pool than the brief needs: the model's plan pass ranks by
# IMPORTANCE, so it must SEE the important-but-not-newest items (a model launch from
# 3 days ago beats an operational blurb from today). Too small a limit lets recency
# cut the big stories before the model ever sees them.
DEFAULT_DAYS = {"daily": 5, "weekly": 12}
DEFAULT_LIMIT = 28
_MIGRATIONS = ("008_briefings.sql", "009_briefing_structure.sql", "010_briefing_persona.sql")

SYSTEM_TASK = (
    "You are the sharp analyst behind a daily AI-intelligence briefing. Work in two "
    "passes, silently. PASS 1 — judgment: read every numbered source (they include real "
    "article BODY text, not just headlines), decide which one or two stories actually "
    "matter most to THIS reader today, and group sources that touch the same company, "
    "model, product, lawsuit, or underlying tension into one theme. PASS 2 — writing: "
    "produce the structured briefing below, OPENING with a short overview that ties "
    "together the day's most important developments, then extracting the ACTUAL substance "
    "(specific numbers, named players, concrete claims) from the bodies — never just "
    "rephrase titles or snippets. Organise the day into a few clear, SYNTHESISED themes "
    "(like Google's Web Guide) — not a wall of prose, and not a list of disconnected "
    "single-item blurbs."
)

SYSTEM_JSON = (
    "Return ONLY valid JSON of this exact shape:\n"
    '{\n'
    '  "quiet_day": <true|false>,\n'
    '  "lede": "<a 2-3 sentence OVERVIEW of the whole day for THIS reader: tie together '
    "the most important developments across the threads below, each carrying a hard "
    "specific (a number, name, or date). This is the gist that the threads then break "
    'down — NOT a restatement of only the first thread>",\n'
    '  "threads": [\n'
    '    {\n'
    '      "title": "<3-6 word theme heading>",\n'
    '      "summary": "<1-2 sentences of real substance: what happened, named players, '
    'specific numbers pulled from the body>",\n'
    '      "so_what": "<ONE sentence: a concrete decision, watch-item, threshold, or '
    'number for THIS reader — not a recap, not generic advice>",\n'
    '      "sources": [<source numbers belonging to this theme>]\n'
    '    }\n'
    '  ]\n'
    '}\n\n'
    "Writing the overview (rank BEFORE writing):\n"
    "- Rank the stories by how much each changes what THIS reader should do or believe — "
    "NOT by how recently they were published and NOT by their order in the list below.\n"
    "- The lede is a 2-3 sentence OVERVIEW covering the top 2-3 developments of the day, "
    "tied together, each with a hard specific. It sits ABOVE the threads and summarises "
    "them, so it must genuinely span the threads — not just the first one. The threads "
    "then break the day into its distinct themes; do NOT make the first thread a mere "
    "restatement of the lede. A single vendor tweaking one product, one funding blurb, or "
    "a personal side-project is almost never worth the overview.\n\n"
    "Synthesis (this is the entire point of the brief):\n"
    "- Before writing, cluster the sources: any sources about the same company, model, "
    "product, lawsuit, or underlying tension MUST be combined into ONE thread with a "
    "stated through-line — do not give each source its own thread. Name the connection.\n"
    "- A thread may cite a single source ONLY if genuinely no other source relates to "
    "it. If two of your threads could be argued to share a theme, merge them.\n"
    "- Surface disagreement or tension between sources where it exists.\n\n"
    "Writing rules:\n"
    "- 'summary' states real substance from the BODY (players, numbers, specifics) and "
    "separates signal from hype. 'so_what' is a single concrete implication for THIS "
    "reader — a decision, a watch-item, a threshold, a number to track — and must NOT "
    "restate the summary or read like consultant filler. Banned so_what openings/verbs "
    "unless immediately followed by a specific number, name, or date: 'Re-evaluate', "
    "'Reassess', 'Monitor', 'Keep an eye on', 'Consider', 'Prepare for', 'Stay ahead', "
    "'Audit your strategy'.\n"
    "- Ban vague quantifiers. Never write 'substantial', 'significant', 'massive', "
    "'several', 'many', 'large', or 'a lot of' in place of a figure. Use the real number "
    "from the body; if the body gives none, write 'an undisclosed amount' or drop the "
    "claim — never dress a missing number up as 'substantial'.\n"
    "- Prioritise substantive developments (model/product releases, research that "
    "changes something, notable industry, legal, or policy moves) over trivia, gadget "
    "deals, personal side-projects, opinion, or incremental preprints — leave trivia "
    "out entirely rather than making a thread for it. Never invent a source number, and "
    "use each source in at most one thread.\n"
    "- Be concrete. No markdown. NO inline source references of any kind — not '[1]', "
    "not '(source 14)', not 'per source 8'. The sources array carries the links.\n\n"
    "Honesty on a quiet day (this outranks hitting any thread count):\n"
    "- If, after ranking, the window has no genuinely important AI news for this reader "
    "(mostly gadget round-ups, side-projects, opinion, plus one or two minor items), set "
    '"quiet_day": true, SAY SO plainly in the lede (e.g. \'Quiet day for AI news that '
    "moves the needle — today's items are minor'), and write only 1-3 short threads. A "
    "short honest brief beats an inflated one. On a normal or busy day set "
    '"quiet_day": false and write 3-5 threads. Never manufacture importance or stakes '
    "the sources do not support."
)

# First pass of the two-pass generation: the model acts as an EDITOR, committing to a
# ranking + clusters BEFORE any prose is written. Separating judgment from writing is
# what stops the writer satisficing into a recency-ordered list of disconnected blurbs.
SYSTEM_PLAN = (
    "You are the editor of a daily AI-intelligence briefing for this reader. Read every "
    "numbered source (they include real BODY text). Output ONLY JSON:\n"
    '{\n'
    '  "quiet_day": <true|false>,\n'
    '  "top_story": <source number of the single most important story for THIS reader>,\n'
    '  "clusters": [ {"theme":"<short>","sources":[<numbers>],'
    '"why_it_matters":"<one line>"} ]\n'
    '}\n'
    "Rank by how much each story changes what THIS reader should do or believe — NOT by "
    "recency and NOT by the order sources appear. The biggest story is rarely the "
    "newest. Merge every source about the same company, model, lawsuit, or tension into "
    "one cluster. Drop trivia (gadget deals, personal side-projects, opinion, "
    "glossaries). If nothing genuinely matters to this reader, set quiet_day true and "
    "keep clusters minimal."
)


def _lens(persona: "personas.Persona | None") -> str:
    if not persona:
        return (
            "Write for a sharp generalist who wants to stay ahead of AI and never fall "
            "behind. Frame the lede and every thread's 'so what' around what actually "
            "changes the field."
        )
    cares = ", ".join(persona.cares_about[:8]) or "developments that change the field"
    noise = ", ".join(persona.noise[:8])
    lines = [
        f"You are briefing ONE specific reader — a {persona.name}. Write everything for THEM:",
        f"- Who they are: {persona.identity}",
        f"- What is signal to them: {cares}",
    ]
    if noise:
        lines.append(f"- What is noise to them (downweight or skip): {noise}")
    lines.append(f"- The question that defines what's relevant to them: {persona.decision_lens}")
    lines.append(
        "Frame the lede and every thread's 'so what' in terms of what THIS reader "
        "should notice, decide, or watch — concretely, not generic industry commentary."
    )
    return "\n".join(lines)


def _system(persona: "personas.Persona | None") -> str:
    return f"{SYSTEM_TASK}\n\n{_lens(persona)}\n\n{SYSTEM_JSON}"


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
    so_what: str = ""
    sources: list[int] = field(default_factory=list)


@dataclass
class Briefing:
    kind: str
    persona_key: str
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
            SELECT a.id, a.title, a.summary, a.body, a.url, a.source, a.source_type,
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


_BODY_CHARS = 1600  # per-source body budget fed to the model (≈9k tokens over 18 sources)


def _build_context(rows: list[tuple]) -> tuple[str, list[Citation], object, object]:
    """Build the model context (rich: title + summary + body) and the citations that
    back the source cards (snippet stays short — the summary, not the whole body)."""
    blocks: list[str] = []
    cites: list[Citation] = []
    ats: list = []
    for i, (aid, title, summary, body, url, source, stype, at, _sub, _sig) in enumerate(rows, 1):
        summary = (summary or "").strip()
        cites.append(
            Citation(
                n=i, article_id=aid, title=title, url=url, source=source,
                snippet=summary[:220] or None,
                published_at=str(at) if at else None,
            )
        )
        ats.append(at)
        # Feed the model real content — summary plus body — so it can extract substance.
        material = (summary + ("\n" + body.strip() if body else ""))[:_BODY_CHARS]
        blocks.append(f"[{i}] {title} — {source} ({theme_for(stype)})\n{material}")
    window_start = min(ats) if ats else None
    window_end = max(ats) if ats else None
    return "\n\n".join(blocks), cites, window_start, window_end


def _ask_groq(system: str, user: str, temperature: float = 0.2,
              reasoning: str = "high") -> str:
    from groq import Groq

    cfg = get_settings()
    client = Groq(api_key=cfg.groq_api_key)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    # Low temperature for a ranking/extraction task (kills run-to-run variance), and
    # gpt-oss-120b is a reasoning model — more reasoning buys sharper ranking/clustering.
    # The plan pass (judgment) runs at high; the write pass (executing the plan) at
    # medium — faster/cheaper without losing the ranking quality. Degrade gracefully if
    # the model rejects reasoning_effort or json mode; surface the error only if all fail.
    last_exc: Exception | None = None
    for extra in (
        {"reasoning_effort": reasoning, "response_format": {"type": "json_object"}},
        {"response_format": {"type": "json_object"}},
        {},
    ):
        try:
            resp = client.chat.completions.create(
                model=cfg.briefing_model, messages=messages,
                temperature=temperature, **extra,
            )
            return resp.choices[0].message.content
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
    raise last_exc  # type: ignore[misc]


def _ask_anthropic(system: str, context: str, span: str) -> str:
    import anthropic

    cfg = get_settings()
    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=1400,
        system=system + "\n\nRespond with the raw JSON object only.",
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


_REF_RE = re.compile(
    r"\s*[\(\[]\s*(?:per\s+|see\s+|from\s+)?sources?\b[^)\]]*[\)\]]"  # (source 14), [sources 6, 8]
    r"|\s*\bper\s+sources?\s+[\d,\s and]+"                             # per source 8
    r"|\s*\[\d+(?:\s*,\s*\d+)*\]",                                    # [1], [1, 2]
    re.IGNORECASE,
)


def _strip_refs(text: str) -> str:
    """Remove any inline source references the model slipped in — the source cards
    carry the links, so they shouldn't appear in the prose."""
    return re.sub(r"\s{2,}", " ", _REF_RE.sub("", text or "")).strip()


def _validate_threads(items, valid_ns: set[int]) -> list[Thread]:
    out: list[Thread] = []
    used: set[int] = set()
    for t in items or []:
        if not isinstance(t, dict):
            continue
        title = _strip_refs(str(t.get("title", "")))
        summary = _strip_refs(str(t.get("summary", "")))
        so_what = _strip_refs(str(t.get("so_what", "")))
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
            out.append(Thread(title=title, summary=summary, so_what=so_what, sources=srcs))
    return out[:6]


def _fallback_narrative(lede: str, threads: list[Thread]) -> str:
    parts = [lede] if lede else []
    for t in threads:
        parts.append(f"{t.title}: {t.summary} {t.so_what}".strip())
    return "\n\n".join(p for p in parts if p) or "No briefing available."


def generate(kind: str = "daily", persona: str = "ceo",
             days: int | None = None, limit: int = DEFAULT_LIMIT) -> Briefing:
    days = days or DEFAULT_DAYS.get(kind, 4)
    p = personas.get_persona(persona)
    rows = _select_articles(days, limit)
    if not rows:
        return Briefing(kind, persona, "No fresh sources in the window yet.", [], [], None, None, 0, "none")
    context, cites, ws, we = _build_context(rows)
    provider = get_settings().synthesis_provider
    span = f"last {days} days"
    if provider == "anthropic":
        raw = _ask_anthropic(_system(p), context, span)
    else:
        # Two-pass: an EDITOR ranks + clusters first (judgment), then the WRITER composes
        # the brief from that plan (prose). Passing the committed plan into the writer is
        # what makes it lead with the biggest story and merge related sources instead of
        # echoing input order. If the plan call fails, fall back to a single write pass.
        lens = _lens(p)
        src_block = f"Time span: {span}\n\nSources:\n{context}"
        try:
            plan = _ask_groq(f"{lens}\n\n{SYSTEM_PLAN}",
                             f"{src_block}\n\nReturn the plan JSON.", reasoning="high")
        except Exception:  # noqa: BLE001
            plan = ""
        writer_user = (
            (f"EDITOR'S PLAN (obey this ranking and these clusters):\n{plan}\n\n" if plan else "")
            + f"{src_block}\n\nReturn the JSON briefing."
        )
        raw = _ask_groq(_system(p), writer_user, reasoning="medium")
    data = _parse_json(raw)
    lede = _strip_refs(str(data.get("lede", "")))
    threads = _validate_threads(data.get("threads"), {c.n for c in cites})
    narrative = _fallback_narrative(lede, threads)
    return Briefing(kind, persona, lede, threads, cites, ws, we, len(cites), provider, narrative=narrative)


def save(b: Briefing) -> int:
    threads_json = json.dumps(
        [{"title": t.title, "summary": t.summary, "so_what": t.so_what, "sources": t.sources}
         for t in b.threads]
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
                (kind, persona_key, narrative, citations, lede, threads,
                 window_start, window_end, article_count, provider)
            VALUES (%s, %s, %s, %s::jsonb, %s, %s::jsonb, %s, %s, %s, %s)
            RETURNING id
            """,
            (b.kind, b.persona_key, b.narrative, cites_json, b.lede, threads_json,
             b.window_start, b.window_end, b.article_count, b.provider),
        ).fetchone()
        conn.commit()
    return row[0]


def latest(kind: str = "daily", persona: str = "ceo") -> Briefing | None:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT kind, persona_key, narrative, citations, lede, threads,
                   window_start, window_end, article_count, provider, generated_at
            FROM briefings WHERE kind = %s AND persona_key = %s
            ORDER BY generated_at DESC LIMIT 1
            """,
            (kind, persona),
        ).fetchone()
    if not row:
        return None
    (kind, persona_key, narrative, cites_json, lede, threads_json,
     ws, we, count, provider, gen) = row
    cites = [
        Citation(
            n=c["n"], article_id=c.get("article_id", 0), title=c["title"], url=c["url"],
            source=c["source"], snippet=c.get("snippet"), published_at=c.get("published_at"),
        )
        for c in (cites_json if isinstance(cites_json, list) else [])
    ]
    threads = [
        Thread(title=t.get("title", ""), summary=t.get("summary", ""),
               so_what=t.get("so_what", ""), sources=t.get("sources", []))
        for t in (threads_json if isinstance(threads_json, list) else [])
    ]
    return Briefing(kind, persona_key, lede or "", threads, cites, ws, we, count, provider,
                    narrative=narrative or "", generated_at=gen)


def generate_and_save(kind: str = "daily", persona: str = "ceo",
                      days: int | None = None, limit: int = DEFAULT_LIMIT) -> Briefing:
    b = generate(kind, persona, days, limit)
    if b.threads or b.lede:  # never persist an empty / failed briefing
        save(b)
    return b
