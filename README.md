# ai-search-experience

A vertical search experience for the AI beat — an **understanding engine**, not a
link aggregator. Ask anything about what's happening in AI; get a cited synthesis
on top, results organized by theme, and a live read on what actually matters.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full vision and build order.

## Status — Phase 1 working on live infra

| Piece | State |
|-------|-------|
| **Ingestion** | arXiv (papers, retry/backoff) + Hacker News (discussion), deduped. |
| **Storage** | Postgres 18 + pgvector 0.8.2 on Railway. |
| **Inverted index** | Postgres native FTS — weighted `tsvector` (title A / summary B / body C) + GIN. |
| **Vector index** | Voyage `voyage-3-lite` (512d), HNSW cosine. |
| **Retrieval** | Hybrid (FTS + pgvector) fused with reciprocal rank fusion, recency-boosted. PageRank dropped — news isn't a link graph. |
| **Synthesis** | Cited AI overview grounded in retrieved chunks (Groq default, Claude optional). Prompted to surface disagreement and refuse to overclaim. |
| **API** | FastAPI `/search`, `/healthz`. |

## Backend

```bash
cd backend
uv sync
cp .env.example .env            # add DATABASE_URL + VOYAGE/GROQ keys
uv run python scripts/migrate.py
uv run python scripts/ingest.py all
uv run python scripts/embed.py
uv run uvicorn app.main:app --reload
# smoke test:
uv run python scripts/query_test.py "latest agentic reasoning advances"
```

## Stack

| Layer       | Tech                                            |
|-------------|-------------------------------------------------|
| Backend     | FastAPI, Python 3.12, psycopg3                   |
| Database    | PostgreSQL 18 + pgvector (Railway)              |
| Embeddings  | Voyage AI (`voyage-3-lite`, 512d)               |
| Synthesis   | Groq (Llama 3.3 70B) / Anthropic (Claude)       |
| Frontend    | Next.js 16 (planned — Phase 2)                  |
| Deploy      | Railway, GitHub-connected                        |

## Why these choices

- **Native Postgres FTS** for the inverted index, not a hand-rolled postings
  table. The from-scratch version (`mini-search-engine`) was a teaching artifact;
  this is production-grade.
- **RRF fusion** of keyword + semantic rank lists — robust, no score-scale tuning.
- **Recency over authority.** A news corpus rewards freshness; link-graph
  authority (PageRank) doesn't transfer.
- **Synthesis with a spine.** The prompt forbids smoothing over disagreement and
  forbids overclaiming when sources are thin.
