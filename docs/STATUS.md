# STATUS — ai-search-experience

**Last updated:** 2026-05-29
**One-liner:** A vertical search experience for the AI beat — cited synthesis on
top, results grouped by theme, live trending. Backend deployed; frontend built
locally, not yet deployed.

This is the operational source of truth. For the *why* and the long-term vision,
see [`ROADMAP.md`](ROADMAP.md).

---

## TL;DR — where we are

Steps A → C of the plan are done. The product works end-to-end:
**ingest → index → embed → hybrid retrieve → cited synthesis → web UI.**

- **Backend:** live in production, GitHub auto-deploy. Verified over HTTPS.
- **Corpus:** 147 articles, 6 sources, all embedded (458 chunks).
- **Frontend:** built + verified locally against the live backend. **Not deployed yet** (your call — "not yet").

---

## Live resources

| Thing | Where |
|-------|-------|
| **GitHub repo** | `hdviettt/ai-search-experience` (private) |
| **Backend URL** | https://ai-search-experience-production.up.railway.app |
| **Railway project** | `ai-search-experience` — **Hoang Duc Viet's Projects** workspace (NOT SEONGON) |
| **Railway services** | `ai-search-experience` (backend, GitHub-connected) + `Postgres` |
| **Database** | PostgreSQL 18.4 + pgvector 0.8.2, host `zephyr.proxy.rlwy.net` |
| **Local path** | `C:\Users\admin\Desktop\workspace\personal\projects\ai-search-experience` |

**API endpoints (live):**
- `GET /healthz` → `{"ok": true}`
- `GET /search?q=<query>&limit=12` → cited answer + themed results
- `GET /trending?limit=10` → hot items (freshness × engagement)

---

## What's built & verified

### Backend (`backend/`) — FastAPI + Python 3.12
- **Ingestion** (`app/ingest/`): `arxiv.py`, `hackernews.py`, `rss.py` (generic
  feed connector). Dedup + retry/backoff. Adding a feed = one line in `rss.py`'s
  `FEEDS` list.
- **Storage** (`migrations/001_init.sql`): `articles` (weighted `tsvector` GIN
  inverted index + `vector(512)` HNSW), `chunks`, `sources`, `ingest_runs`.
- **Embeddings** (`app/embed.py`): Voyage `voyage-3-lite`, 512d, word-based chunking.
- **Retrieval** (`app/retrieval.py`): hybrid FTS + pgvector, fused with RRF,
  recency-boosted. PageRank intentionally dropped (news ≠ link graph).
- **Synthesis** (`app/synthesis.py`): cited overview from retrieved chunks.
  Groq default (`llama-3.3-70b`), Anthropic optional. Prompted to surface
  disagreement + refuse to overclaim.
- **Discovery** (`app/discovery.py`): `/trending` + theme labels.
- **API** (`app/main.py`): `/search`, `/trending`, `/healthz`.

### Frontend (`frontend/`) — Next.js 16 + React 19 + Tailwind v4
Built, production build green, SSR-verified against the live backend. **Local only.**
- Hero "Ask anything" search + example chips (`app/page.tsx`).
- Search results page (`app/search/page.tsx`) — Server Components, no client waterfall.
- **AI Overview** block with inline `[n]` citation links (`components/AnswerBlock.tsx`, `Citations.tsx`).
- **Theme-grouped results** — Releases / Research / News / Discussion (`components/ResultGroups.tsx`).
- **Trending rail** (`components/TrendingRail.tsx`).
- Design: Swiss-modernist + AI-native, single indigo accent (`#4F46E5`), Geist font.
- API client: `lib/api.ts` (base URL via `NEXT_PUBLIC_API_BASE`, defaults to live backend).

---

## Corpus (as of last ingest)

```
TOTAL = 147 articles   EMBEDDED = 147   CHUNKS = 458

  30  openai-blog      (release)
  30  huggingface      (release)
  30  deepmind-blog    (release)
  20  google-ai-blog   (news)
  20  import-ai        (news)
  17  hackernews       (discussion)
```

**Gap:** no `paper` (Research) items yet — arXiv is rate-limit throttled (see below).

---

## Git history

| Commit | What |
|--------|------|
| `a820702` | Phase 1 — engine on live infra (ingest, retrieval, synthesis) |
| `d0a2961` | Step B — broaden corpus to 6 sources via RSS connector |
| `8a8f9c2` | Step C — Next.js search surface + `/trending` + theme labels |

Backend auto-deploys from `main`. Last deploy confirmed live (`/trending` = 200).

---

## Decisions locked

- **Stack:** FastAPI/Python backend + Next.js frontend (port, not rebuild).
- **Railway:** personal workspace, GitHub-connected deploy (not `railway up`).
- **DB var:** `DATABASE_URL=${{Postgres.DATABASE_URL}}` reference.
- **Flagship differentiator (future):** signal-over-hype ranking (Tier-3, Phase 3).
- **Control space:** build as a route in the Next app (after Step C — i.e. now-ish).
- **Scheduling:** yes — Railway cron for ingest+embed (not built yet).
- **Frontend deploy:** **not yet** (deferred by choice 2026-05-29).

---

## Open / pending / deferred

- [ ] **Deploy frontend** to Railway (2nd service, root `frontend`,
      `NEXT_PUBLIC_API_BASE` → backend URL). Deferred by choice.
- [ ] **arXiv backfill** — rate-limit cooldown active. Connector is fixed +
      idempotent; `python scripts/ingest.py arxiv` once the ban clears fills papers.
- [ ] **Deferred sources** (no working RSS, need HTML scraping): `anthropic-blog`,
      `meta-ai-blog`, `the-batch`.
- [ ] **Central control panel** — source health, trigger ingests, corpus stats.
- [ ] **Railway cron** — scheduled ingest+embed (freshness is the product).
- [ ] **Corpus quality** — some HuggingFace community posts are low-signal; will
      matter once signal-scoring (Phase 3) lands.
- [ ] **Tighten CORS** before any public launch (currently `*`).

---

## How to operate it (local)

All backend ops run from `backend/` with env vars set. The DB URL comes from
Railway; the API keys come from the workspace `.env.local`.

```bash
cd backend
# env (PowerShell-friendly equivalents exist; bash shown):
export DATABASE_URL="$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)"
export VOYAGE_API_KEY="<from workspace .env.local>"
export GROQ_API_KEY="<from workspace .env.local>"

./.venv/Scripts/python.exe scripts/migrate.py          # apply schema (idempotent)
./.venv/Scripts/python.exe scripts/ingest.py all       # arxiv + hackernews + rss
./.venv/Scripts/python.exe scripts/embed.py            # embed new articles
./.venv/Scripts/python.exe scripts/sources.py          # corpus breakdown (read-only)
./.venv/Scripts/python.exe scripts/query_test.py "your question"   # smoke test
```

Frontend:
```bash
cd frontend
bun install
bun run build && bun run start    # serves on :3000 against the live backend
```

**Gotchas (learned the hard way):**
- Workspace uses **bun, not npm** (a hook enforces it).
- Set `PYTHONUTF8=1` for scripts that print article titles (Windows cp1252).
- arXiv throttles aggressively — space out requests, don't hammer on 429.
- This folder's Railway link is global per-dir; `railway status` to confirm it
  points at `ai-search-experience` before any DB/deploy command.

---

## Next step options (pick up here after coffee)

1. **Deploy frontend** — get the search UI on a public URL.
2. **Control space** — the admin panel you asked for (corpus/source management).
3. **Scheduled ingestion** — Railway cron so the corpus self-refreshes.
4. **Polish search UX** — streaming answers, loading/empty states, mobile.
5. **Fix corpus gaps** — arXiv papers + deferred sources, so all themes populate.
