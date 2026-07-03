"""FastAPI surface for ai-search-experience."""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import briefing, discovery, feed, personas, retrieval, synthesis
from app.admin import router as admin_router

app = FastAPI(title="ai-search-experience")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before public launch
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)


class ResultOut(BaseModel):
    id: int
    url: str
    title: str
    summary: str | None
    source: str
    source_type: str
    theme: str
    published_at: str | None
    score: float


class CitationOut(BaseModel):
    n: int
    title: str
    url: str
    source: str


class SearchOut(BaseModel):
    query: str
    answer: str
    citations: list[CitationOut]
    provider: str
    results: list[ResultOut]


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


# --- Personas & feed ---

class PersonaOut(BaseModel):
    key: str
    name: str
    tagline: str | None


@app.get("/personas", response_model=list[PersonaOut])
def list_personas() -> list[PersonaOut]:
    return [
        PersonaOut(key=p.key, name=p.name, tagline=p.tagline)
        for p in personas.list_personas(enabled_only=True)
    ]


class FeedItemOut(BaseModel):
    id: int
    url: str
    title: str
    summary: str | None
    source: str
    theme: str
    published_at: str | None
    signal: float
    relevance: float
    substance: float | None
    hype_gap: float | None
    angle: str | None


class FeedOut(BaseModel):
    persona: str
    persona_name: str
    items: list[FeedItemOut]
    coverage: dict


@app.get("/feed", response_model=FeedOut)
def get_feed(persona: str = "ceo", limit: int = 20,
             min_relevance: float = 4.0) -> FeedOut:
    p = personas.get_persona(persona)
    if not p:
        return FeedOut(persona=persona, persona_name=persona, items=[], coverage={})
    items = feed.persona_feed(persona, limit=limit, min_relevance=min_relevance)
    return FeedOut(
        persona=p.key,
        persona_name=p.name,
        coverage=feed.feed_stats(persona),
        items=[
            FeedItemOut(
                id=i.id, url=i.url, title=i.title, summary=i.summary,
                source=i.source, theme=i.theme,
                published_at=str(i.published_at) if i.published_at else None,
                signal=round(i.signal, 3), relevance=i.relevance,
                substance=i.substance, hype_gap=i.hype_gap, angle=i.angle,
            )
            for i in items
        ],
    )


@app.get("/search", response_model=SearchOut)
def search(q: str = Query(..., min_length=2), limit: int = 10,
           with_overview: bool = True) -> SearchOut:
    results = retrieval.search(q, limit=limit)
    ov = synthesis.overview(q) if with_overview else synthesis.Overview("", [], "none")
    return SearchOut(
        query=q,
        answer=ov.answer,
        citations=[
            CitationOut(n=c.n, title=c.title, url=c.url, source=c.source)
            for c in ov.citations
        ],
        provider=ov.provider,
        results=[
            ResultOut(
                id=r.id, url=r.url, title=r.title, summary=r.summary,
                source=r.source, source_type=r.source_type,
                theme=discovery.theme_for(r.source_type),
                published_at=str(r.published_at) if r.published_at else None,
                score=round(r.score, 5),
            )
            for r in results
        ],
    )


class TrendingOut(BaseModel):
    id: int
    title: str
    url: str
    source: str
    source_type: str
    theme: str
    published_at: str | None
    heat: float


# --- daily/weekly briefing ---

class BriefingCitationOut(BaseModel):
    n: int
    title: str
    url: str
    source: str


class BriefingOut(BaseModel):
    kind: str
    narrative: str
    citations: list[BriefingCitationOut]
    window_start: str | None
    window_end: str | None
    article_count: int
    provider: str
    generated_at: str | None


@app.get("/briefing", response_model=BriefingOut | None)
def get_briefing(kind: str = "daily") -> BriefingOut | None:
    b = briefing.latest(kind)
    if not b:
        return None
    return BriefingOut(
        kind=b.kind,
        narrative=b.narrative,
        citations=[
            BriefingCitationOut(n=c.n, title=c.title, url=c.url, source=c.source)
            for c in b.citations
        ],
        window_start=str(b.window_start) if b.window_start else None,
        window_end=str(b.window_end) if b.window_end else None,
        article_count=b.article_count,
        provider=b.provider,
        generated_at=str(b.generated_at) if b.generated_at else None,
    )


@app.get("/trending", response_model=list[TrendingOut])
def trending(limit: int = 10) -> list[TrendingOut]:
    return [
        TrendingOut(
            id=t.id, title=t.title, url=t.url, source=t.source,
            source_type=t.source_type, theme=t.theme,
            published_at=str(t.published_at) if t.published_at else None,
            heat=round(t.heat, 4),
        )
        for t in discovery.trending(limit=limit)
    ]
