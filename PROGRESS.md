# ai-search-experience — Development Progress

**A vertical search engine for the AI beat.** Ask anything about what's happening
in AI; get a cited synthesis on top, results organized by theme, and a live read
on what actually matters right now.

Not a link aggregator — an *understanding engine*. The thesis behind it is my
own: AI is changing how people search and absorb information. This product is that
argument, built instead of written.

**Live now:**
- App — https://frontend-production-b272.up.railway.app
- API — https://ai-search-experience-production.up.railway.app
- Repo — `github.com/hdviettt/ai-search-experience`

**Last updated:** 2026-05-29

---

## Why this exists

Search is being rewritten in real time. Ten blue links are giving way to AI
answers — Google's AI Mode and Web Guide, Baidu's AI+ box, Perplexity. I wanted
to understand that shift by building it, narrowed to one domain I know cold: AI
news and research.

The references I designed against:
- **Google Web Guide** — results clustered into AI-generated themes, not a flat list.
- **Google AI Mode** — chat-first, "Ask anything," cited structured answers.
- **Baidu** — an AI answer box on top *and* a live trending rail beside it.

The bet isn't to copy them. A clean aggregator gets cloned in a weekend. The
durable edge is changing **the unit of search** (stories over time, not isolated
articles) and **what gets ranked** (signal over hype). That's the long game —
the foundation had to come first.

---

## Where we are

A working product, live on real infrastructure, fed by a real corpus.

| Layer | State |
|-------|-------|
| **Ingestion** | 3 connectors (arXiv, Hacker News, RSS) pulling from 6+ sources |
| **Corpus** | ~270 articles across all four content themes, fully embedded |
| **Index** | Postgres FTS (keyword) + pgvector (semantic), 600+ chunks |
| **Retrieval** | Hybrid search, reciprocal-rank fusion, recency-weighted |
| **Synthesis** | Cited AI answers (Groq), prompted to surface disagreement |
| **Surface** | Next.js app — search, themed results, trending rail |
| **Deploy** | Railway, GitHub auto-deploy, both services live |
| **Scheduling** | Pipeline built; cron service being wired up |

You can use it today: ask a question, get a cited answer drawing from OpenAI,
DeepMind, Google, HuggingFace, arXiv and Hacker News, with results grouped into
Releases / Research / News / Discussion.

---

## How it works

```
  SOURCES                  PIPELINE                      QUERY
  ───────                  ────────                      ─────
  arXiv (papers)     ┐                              ┌→  keyword (Postgres FTS)
  Hacker News        ├→  ingest → dedup → embed  →  │   + semantic (pgvector)
  OpenAI / DeepMind  │   (Voyage 512d)    │         │       ↓
  Google / HF blogs  │                    ▼         │   RRF fusion + recency
  Import AI          ┘            Postgres + pgvector│       ↓
                                  (FTS index + HNSW) └→  themed results
                                         │                    +
                                         └──────────→   cited AI synthesis
                                                        (grounded in chunks)
```

**Decisions worth noting:**
- **Postgres-native full-text search** for the keyword index, not a hand-rolled
  one. Production-grade, not a toy.
- **PageRank dropped.** A news corpus isn't a link graph — freshness and source
  authority matter, link authority doesn't transfer.
- **Synthesis with a spine.** The model is told to surface disagreement and
  refuse to overclaim when sources are thin. On the AI beat, the contested and
  the unknown are themselves information.

---

## The journey — milestones

**1. Vision & architecture.** Defined the product as an understanding engine, not
an aggregator. Mapped the three reference UIs to three surfaces. Picked the
foundation-first build order: infrastructure before cleverness.

**2. Foundation on live infra.** Stood up Postgres 18 + pgvector on Railway in a
personal workspace. Built the ingestion → index → embed → retrieve → synthesize
pipeline end-to-end. First cited answers over a real corpus.

**3. Backend deployed.** GitHub-connected auto-deploy. Public API serving
`/search`, `/trending`, `/healthz`.

**4. Corpus broadened.** From a single source to six, via a generic RSS connector
— lab blogs, newsletters, papers, discussion. One config line adds a feed.

**5. The front door.** Next.js search surface: "Ask anything" hero, cited answer
block with inline source links, theme-grouped results, trending rail. Deployed
and live.

**6. Hardening.** Fixed real-world friction: arXiv rate-limiting (switched to its
RSS feeds), a flaky build dependency (moved the frontend to a Docker image so
deploys are deterministic), encoding and type edge cases.

**7. Automation (in progress).** Extracted a reusable ingest+embed pipeline and
began wiring a scheduled job so the corpus refreshes itself.

---

## What's next

**Near term — keep it fed and controllable.**
- [ ] Finish the **scheduled ingestion** cron (every 6h, hands-free refresh).
- [ ] **Control panel** — one screen to see source health, trigger ingests, and
      watch corpus stats. The cockpit for running this.
- [ ] Fill remaining sources (Anthropic, Meta, The Batch) that need scraping.
- [ ] Tighten security (CORS) before any public push.

**The real bet — the differentiator.**
- [ ] **Signal-over-hype ranking.** A visible signal score on every item —
      "does this actually change anything?" — and the option to rank by it.
      This is the one-line pitch: *the AI search engine that tells you what
      actually matters.* Opinionated, shareable, and something a neutral
      aggregator structurally can't ship.

**Further out — the understanding layer.**
- [ ] Story-as-unit: track a claim over time, not as scattered articles.
- [ ] Source calibration: weight sources by whether they were right before.
- [ ] Reader memory: "what changed in AI since you last looked."

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Tailwind v4 |
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 18 + pgvector |
| Embeddings | Voyage AI (`voyage-3-lite`, 512d) |
| Synthesis | Groq (Llama 3.3 70B); Anthropic optional |
| Hosting | Railway (GitHub auto-deploy) |

---

*For operational detail — exact URLs, how to run it locally, open tickets — see
[`docs/STATUS.md`](docs/STATUS.md). For the full vision and reasoning, see
[`docs/ROADMAP.md`](docs/ROADMAP.md).*
