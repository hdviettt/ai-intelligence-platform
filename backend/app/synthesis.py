"""Cited AI overview grounded in retrieved chunks.

Default provider is Groq (fast, cheap). Anthropic/Claude is an opt-in upgrade.
Surfaces disagreement instead of smoothing it — the point on the AI beat.
"""
from dataclasses import dataclass

from app.config import get_settings
from app.db import get_connection
from app.embed import embed_query

SYSTEM = (
    "You are an AI-news analyst. Answer the user's question about the AI field "
    "using ONLY the numbered sources provided. Be concise and concrete. Cite "
    "every claim with bracketed numbers like [1], [2]. If the sources disagree, "
    "say so explicitly instead of smoothing it over. If the sources don't cover "
    "the question, say that plainly."
)


@dataclass
class Citation:
    n: int
    article_id: int
    title: str
    url: str
    source: str


@dataclass
class Overview:
    answer: str
    citations: list[Citation]
    provider: str


def _top_chunks(query: str, k: int = 8) -> list[tuple]:
    qvec = embed_query(query)
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT c.content, a.id, a.title, a.url, a.source
            FROM chunks c
            JOIN articles a ON a.id = c.article_id
            WHERE c.embedding IS NOT NULL
            ORDER BY c.embedding <=> %s::vector
            LIMIT %s
            """,
            (qvec, k),
        ).fetchall()


def _build_context(chunks: list[tuple]) -> tuple[str, list[Citation]]:
    blocks, cites, seen = [], [], {}
    for content, aid, title, url, source in chunks:
        if aid not in seen:
            seen[aid] = len(seen) + 1
            cites.append(Citation(seen[aid], aid, title, url, source))
        n = seen[aid]
        blocks.append(f"[{n}] {title}\n{content}")
    return "\n\n".join(blocks), cites


def _ask_groq(question: str, context: str) -> str:
    from groq import Groq

    cfg = get_settings()
    client = Groq(api_key=cfg.groq_api_key)
    resp = client.chat.completions.create(
        model=cfg.groq_model,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Sources:\n{context}\n\nQuestion: {question}"},
        ],
        temperature=0.2,
    )
    return resp.choices[0].message.content


def _ask_anthropic(question: str, context: str) -> str:
    import anthropic

    cfg = get_settings()
    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": f"Sources:\n{context}\n\nQuestion: {question}"}],
    )
    return "".join(b.text for b in msg.content if b.type == "text")


def overview(question: str) -> Overview:
    chunks = _top_chunks(question)
    if not chunks:
        return Overview("No indexed sources cover this yet.", [], "none")
    context, cites = _build_context(chunks)
    provider = get_settings().synthesis_provider
    answer = (
        _ask_anthropic(question, context)
        if provider == "anthropic"
        else _ask_groq(question, context)
    )
    return Overview(answer, cites, provider)
