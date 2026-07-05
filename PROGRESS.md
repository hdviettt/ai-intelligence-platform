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
| **Ingestion** | 3 connectors (arXiv, Hacker News, RSS) over 7 sources, **managed from /admin** |
| **Corpus** | ~270 articles across all four content themes, fully embedded |
| **Index** | Postgres FTS (keyword) + pgvector (semantic), 600+ chunks |
| **Retrieval** | Hybrid search, reciprocal-rank fusion, recency-weighted |
| **Synthesis** | Cited AI answers (Groq), prompted to surface disagreement |
| **Surface** | Next.js app — search, themed results, trending rail |
| **Deploy** | Railway, GitHub auto-deploy, all services live |
| **Scheduling** | ✅ Cron every 6h — corpus self-refreshes hands-free |
| **Control panel** | ✅ /admin — corpus stats, source CRUD, manual trigger |

You can use it today: ask a question, get a cited answer drawing from OpenAI,
DeepMind, Google, HuggingFace, arXiv and Hacker News, with results grouped into
Releases / Research / News / Discussion. And manage the whole corpus — add/edit
sources, trigger ingests — from the `/admin` cockpit.

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

**7. Automation.** Extracted a reusable ingest+embed pipeline and put it behind a
6-hour Railway cron — the corpus now refreshes itself, verified running in
production.

**8. The cockpit.** Made sources *data* (a DB table, not hardcoded), and built an
`/admin` control panel: corpus stats, source health, add/edit/enable/disable/delete
sources, and trigger ingests on demand. Adding a feed is now a form, not a deploy.

---

## What's next

**▶ Agreed focus (Jul 2026), in priority order:**
1. **Unblock signal scoring** — the root bottleneck; raises the quality ceiling of
   both the persona feed and the daily brief (both currently fall back to recency).
2. **Weekly brief** — same engine as the daily brief, wider window (`kind=weekly`).
3. **Scraping connector** — unlock sources without RSS (Anthropic, Meta, The Batch).

*In progress: restructuring the daily brief into themed clusters (Google Web Guide
style) — a lede + thematic threads, each with an AI description and source cards.*

**The real bet — the differentiator (start here).**
- [ ] **Signal-over-hype ranking.** A visible signal score on every item —
      "does this actually change anything?" — and the option to rank by it.
      This is the one-line pitch: *the AI search engine that tells you what
      actually matters.* Opinionated, shareable, and something a neutral
      aggregator structurally can't ship. Everything to date is foundation;
      this is the first thing that makes the product *mine*.

**Near term — close the gaps.**
- [ ] Scraping connector to unlock sources without RSS (Anthropic, Meta, The Batch).
- [ ] Real auth (login) for /admin — current token is interim.
- [ ] Tighten CORS before any public push.

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
