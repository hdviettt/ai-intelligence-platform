"""FastAPI surface for ai-search-experience."""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import retrieval, synthesis

app = FastAPI(title="ai-search-experience")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before public launch
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResultOut(BaseModel):
    id: int
    url: str
    title: str
    summary: str | None
    source: str
    source_type: str
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
                published_at=str(r.published_at) if r.published_at else None,
                score=round(r.score, 5),
            )
            for r in results
        ],
    )
