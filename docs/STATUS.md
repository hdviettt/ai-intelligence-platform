# STATUS — ai-search-experience

**Last updated:** 2026-05-29
**One-liner:** A vertical search experience for the AI beat — cited synthesis on
top, results grouped by theme, live trending. **Fully deployed and self-feeding.**

Operational source of truth. For the *why* / long-term vision see
[`ROADMAP.md`](ROADMAP.md); for the narrative overview see
[`../PROGRESS.md`](../PROGRESS.md).

---

## TL;DR — where we are

A working product, live on real infra, fed by a self-refreshing corpus, with an
admin cockpit to manage it. The full chain runs in production:
**ingest → index → embed → hybrid retrieve → cited synthesis → web UI**, plus a
6-hour cron that keeps it fresh and an `/admin` panel to manage sources & trigger runs.

What's **not** built yet: the flagship differentiator (signal-over-hype ranking)
and real auth. Everything to date is excellent *foundation* — still cloneable.

---

## Live resources

| Thing | Where |
|-------|-------|
| **GitHub repo** | `hdviettt/ai-search-experience` (private) |
| **App (public)** | https://frontend-production-b272.up.railway.app |
| **Admin panel** | https://frontend-production-b272.up.railway.app/admin (not linked from public UI) |
| **Backend API** | https://ai-search-experience-production.up.railway.app |
| **Railway project** | `ai-search-experience` — **Hoang Duc Viet's Projects** workspace (NOT SEONGON) |
| **Railway services** | `ai-search-experience` (backend) · `frontend` · `ingest-cron` · `Postgres` — all GitHub-connected |
| **Database** | PostgreSQL 18.4 + pgvector 0.8.2, host `zephyr.proxy.rlwy.net` |
| **Local path** | `C:\Users\admin\Desktop\workspace\personal\projects\ai-search-experience` |

### Secrets (where they live — never in git)
- `DATABASE_URL` — Railway reference `${{Postgres.DATABASE_URL}}` on each service.
- `VOYAGE_API_KEY`, `GROQ_API_KEY` — set on backend + ingest-cron services; also in
  workspace `.env.local` for local runs.
- `ADMIN_TOKEN` — set on the **backend** service (enables `/admin` writes).
  Value is in Railway env only. Paste into the `/admin` token field to use the panel.
- `NEXT_PUBLIC_API_BASE` — set on `frontend` → backend URL.

---

## API endpoints (live)

**Public**
- `GET /healthz` -> `{"ok": true}`
- `GET /search?q=<query>&limit=12` -> cited answer + theme-grouped results
- `GET /trending?limit=10` -> hot items (freshness x engagement)

**Admin** (reads open; writes require `X-Admin-Token` header, disabled unless `ADMIN_TOKEN` set)
- `GET /admin/stats` -> totals, by-source, by-theme, embed coverage
- `GET /admin/runs?limit=20` -> recent `ingest_runs`
- `GET /admin/sources` -> all ingest sources
- `POST /admin/sources` · `PATCH /admin/sources/{id}` · `DELETE /admin/sources/{id}` -> source CRUD
- `POST /admin/ingest` body `{sources?: [...], max_results?: N}` -> run a subset or all

---

## What's built & verified

### Backend (`backend/`) — FastAPI + Python 3.12
- **Ingestion** (`app/ingest/`): connectors `arxiv.py`, `hackernews.py`, `rss.py`,
  each `fetch_one(source)` reading config from the DB. `base.py` holds the `Article`
  record, dedup/upsert, and `ingest_sources` CRUD.
- **Sources are data** (`ingest_sources` table): connector + type + JSONB config +
  max_results + enabled. Managed from `/admin`. No code change to add a feed.
- **Pipeline** (`app/pipeline.py`): the one shared code path — `run_pipeline()` loads
  enabled sources, dispatches each to its connector, then `embed_pending()`. Used by
  the CLI, the cron, and the admin trigger.
- **Storage** (`migrations/`): `001_init.sql` (articles w/ weighted `tsvector` GIN +
  `vector(512)` HNSW; chunks; sources; ingest_runs). `002_ingest_sources.sql`
  (data-driven sources, seeded).
- **Embeddings** (`app/embed.py`): Voyage `voyage-3-lite`, 512d, word-chunking.
- **Retrieval** (`app/retrieval.py`): hybrid FTS + pgvector, RRF fusion, recency-boosted.
  PageRank intentionally dropped (news != link graph).
- **Synthesis** (`app/synthesis.py`): cited overview from retrieved chunks. Groq
  default (`llama-3.3-70b`), Anthropic optional. Prompted to surface disagreement.
- **Discovery** (`app/discovery.py`): trending + theme labels.
- **Admin** (`app/admin.py`): stats / runs / source CRUD / ingest trigger.
- **API** (`app/main.py`): mounts everything.

### Frontend (`frontend/`) — Next.js 16 + React 19 + Tailwind v4
- Public: `/` hero ("Ask anything" + examples + trending), `/search` (cited answer
  block w/ inline `[n]` links, theme-grouped results, trending rail).
- Admin: `/admin` (stat cards, source manager w/ add-edit-enable-disable-delete-run,
  recent ingest runs). Token persisted in browser localStorage.
- **Deploys via Dockerfile (`oven/bun:1`)**, NOT Railpack — Railpack's mise bun
  download fails intermittently on Railway (`Connection reset by peer`). Dockerfile
  bakes bun in -> deterministic. Root dir `/frontend`.

### Infra
- **ingest-cron** service: `0 */6 * * *`, runs `scripts/pipeline.py`, restart NEVER.
  Config in `backend/railway.cron.json`; service Settings -> root `/backend`,
  config file `railway.cron.json`. Verified running in Railway's runtime.

---

## Corpus (as of 2026-05-29)

```
TOTAL = 271 articles   EMBEDDED = 271   CHUNKS = 605

  120  arxiv          (paper)        <- Research
   31  openai-blog    (release)
   30  huggingface    (release)
   30  deepmind-blog  (release)
   20  google-ai-blog (news)
   20  import-ai      (news)
   17  hackernews     (discussion)
```

All four themes populated. Self-refreshing every 6h via cron.

---

## Decisions locked

- **Stack:** FastAPI/Python backend + Next.js frontend (ported the engine, not rebuilt).
- **Railway:** personal workspace; GitHub-connected auto-deploy (not `railway up`).
- **DB var:** `DATABASE_URL=${{Postgres.DATABASE_URL}}` reference.
- **Frontend build:** Dockerfile on `oven/bun` (Railpack's bun install is flaky).
- **arXiv source:** RSS feeds (`rss.arxiv.org`), not the throttled export API.
- **Sources:** data-driven (`ingest_sources`), managed from `/admin`.
- **Scheduling:** Railway cron, every 6h.
- **Admin auth:** interim shared-secret token; real login before any public launch.
- **Flagship differentiator (next big bet):** signal-over-hype ranking (Phase 3).

---

## Open / pending / deferred

- [ ] **Flagship: signal-over-hype ranking** (Phase 3 — the real differentiator,
      the thing a neutral aggregator can't ship). Biggest lever; not started.
- [ ] **Deferred sources** — Anthropic, Meta AI, The Batch have no working RSS;
      need a scraping connector (a new connector type, ~half a day). You can add any
      *working* feed from `/admin` today.
- [ ] **Proper admin auth** (login/session) — token is interim.
- [ ] **Tighten CORS** before any public launch (currently `*`).
- [ ] **Corpus quality** — some HuggingFace community posts are low-signal; matters
      once signal-scoring lands (per-source weighting already possible via config).
- [ ] Possible: split admin to its own surface/service if it should be fully isolated.

---

## How to operate it (local)

Backend ops run from `backend/` with env vars set (DB URL from Railway; keys from
workspace `.env.local`).

```bash
cd backend
export DATABASE_URL="$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)"
export VOYAGE_API_KEY="<from workspace .env.local>"
export GROQ_API_KEY="<from workspace .env.local>"

./.venv/Scripts/python.exe scripts/migrate.py        # apply schema (idempotent)
./.venv/Scripts/python.exe scripts/ingest.py         # all enabled sources
./.venv/Scripts/python.exe scripts/ingest.py --only arxiv --max 40
./.venv/Scripts/python.exe scripts/pipeline.py       # ingest + embed (what cron runs)
./.venv/Scripts/python.exe scripts/embed.py          # embed pending only
./.venv/Scripts/python.exe scripts/sources.py        # corpus breakdown (read-only)
./.venv/Scripts/python.exe scripts/runs.py           # recent ingest runs (cron health)
./.venv/Scripts/python.exe scripts/query_test.py "your question"   # retrieval+synth smoke
```

Frontend:
```bash
cd frontend
bun install
bun run build && bun run start   # :3000, hits the live backend
```

**Gotchas (learned the hard way):**
- Workspace uses **bun, not npm** (a hook enforces it).
- Set `PYTHONUTF8=1` for scripts printing article titles (Windows cp1252).
- arXiv export API throttles hard — we use its RSS feeds instead.
- This folder's Railway link is global per-dir; run `railway status` to confirm it
  points at `ai-search-experience` before any DB/deploy command.
- Never put `ADMIN_TOKEN` (or any secret) on a command line — use the browser panel
  or read from env. (A classifier blocks inline-secret commands, correctly.)
- Railway's log API returns empty for cron services — use `scripts/runs.py` (DB) for
  cron health, not `railway logs`.

---

## Verify it's alive (quick checks)

```bash
curl -s https://ai-search-experience-production.up.railway.app/healthz       # {"ok":true}
curl -s "https://ai-search-experience-production.up.railway.app/admin/stats" # corpus counts
# open the app:  https://frontend-production-b272.up.railway.app
# open admin:    https://frontend-production-b272.up.railway.app/admin  (paste ADMIN_TOKEN)
```

---

## Next session — pick up here

In rough priority:
1. **Signal-over-hype ranking** — the differentiator. Score each item "does this
   change anything?", make it visible, allow rank-by-signal. One-line pitch:
   *the AI search engine that tells you what actually matters.*
2. **Scraping connector** — unlock Anthropic / Meta / The Batch.
3. **Real auth** + CORS lockdown — prerequisites for any public launch.
4. Streaming answers / UX polish on the search surface.
