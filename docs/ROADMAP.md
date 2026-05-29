# ai-search-experience — Roadmap

A vertical search experience for the AI beat. Not a link aggregator — an
**understanding engine**: ask anything about what's happening in AI, get a cited
synthesis on top, results organized by theme instead of a flat list, and a live
read on what actually matters right now.

The thesis behind it is Viet's own: AI is changing how people *search* and
*absorb* information. This product is that argument, built instead of written.

---

## Vision — what makes this not just "Perplexity for AI news"

Copying Web Guide + AI Mode + Baidu onto the AI beat is a skin. The innovation is
changing **the unit of search** and **what gets ranked**:

- Everyone searches *documents*, ranked by *relevance + recency + popularity*.
- We search *stories/claims over time*, ranked by **signal vs hype**, with
  **sources calibrated by track record**, and **disagreement surfaced** instead
  of smoothed away.

That is something a neutral aggregator structurally can't ship, because it
requires a point of view and memory. We have both.

### The five innovation pillars (Tier 3 — the moat)

1. **Signal-over-hype ranking** *(FLAGSHIP — lead with this)*
   A visible signal score on every item. Rank by "does this actually change
   anything?", not by recency or popularity. One-line pitch:
   *"the AI search engine that tells you what actually matters."*
   Opinionated, screenshot-able, viscerally on-brand.

2. **Story-as-unit (claim tracking over time)** *(the debated alternative)*
   The atomic unit is the story-over-time, not the article. Who said what, when,
   and whether it held up. More profound than signal-scoring, longer build.
   Google can't follow here — they're committed to the document as the unit.

3. **Source calibration by track record**
   Weight sources by whether they were right before. Turn trust into a
   measurable, visible signal. A Medium post and an arXiv paper should not render
   identically.

4. **Disagreement surfacing**
   On the AI beat the disagreement *is* the information. Synthesis says "here's
   what's contested, here's who's on each side" instead of a tidy consensus.

5. **Reader memory — "what changed since you last looked"**
   A personalized diff of the field. "Here are the 3 things that moved this week,
   skip the rest." The daily-habit hook and a direct attack on passive scroll.

**v1 commitment:** ship the Tier-2 surface (below) as the vehicle, then lead with
**ONE** Tier-3 pillar — the flagship, signal-over-hype ranking. Do not build all
five at once. Story-tracking is the one pick worth debating before we lock it.

---

## Build order (dependency-correct — foundation before features)

The Tier-3 vision is garbage-in-garbage-out on a thin or stale corpus. So:

```
Phase 0  Foundation: ingestion → inverted index → vector DB → retrieval
Phase 1  Synthesis: cited AI answer + theme clustering
Phase 2  Surface: search UI + trending rail (the Tier-2 product, shippable)
Phase 3  Flagship: signal-over-hype scoring, visible on every item
Phase 4+ Remaining Tier-3 pillars, one at a time
```

---

## Phase 0 — Foundation (infrastructure)

The part Viet flagged: crawling → inverted index → vector DB. This is where most
of the early effort goes, and getting it right is non-negotiable.

### Ingestion loop (rebuild — the old BFS crawler gets gutted)
- [ ] Source connectors: arXiv (cs.AI / cs.CL / cs.LG), Hacker News, lab blogs
      (OpenAI, Anthropic, Google DeepMind, Meta AI), GitHub trending
- [ ] Newsletter / RSS connectors (curated list of AI newsletters)
- [ ] Scheduled polling (continuous, not one-shot) — freshness is the product
- [ ] Deduplication (same story across sources collapses to one document)
- [ ] Canonical fetch + readable-content extraction (strip nav/ads)
- [ ] Rate limiting + robots.txt compliance (port from existing crawler)
- [ ] Ingestion job dashboard / status (port WebSocket job progress)

### Data model (pivot `pages` → `articles`)
- [ ] `articles` table: url, title, body, source, author, `published_at`,
      `source_type` (paper | news | release | discussion), fetched_at
- [ ] Source registry table (for later track-record calibration)
- [ ] Story/cluster table (groundwork for story-as-unit, even if unused in v1)
- [ ] Migrations + seed (Drizzle or SQL — TBD with stack decision)

### Inverted index (port, retune)
- [ ] Tokenizer + stemmer + stopwords (port from `indexer/`)
- [ ] Inverted index build via Postgres COPY (port)
- [ ] BM25F scoring with title weighting (port `ranker/bm25.py`)

### Vector database (port)
- [ ] Chunker (~300-token chunks) (port `rag/chunker.py`)
- [ ] Embedder — Voyage `voyage-3-lite`, 512d (port `rag/embedder.py`)
- [ ] pgvector store + ANN index (port)
- [ ] Hybrid retriever: vector + keyword fan-out (port `rag/retriever.py`)

### Ranking blend (retune for news)
- [ ] Drop/de-weight PageRank — news isn't a link graph
- [ ] New blend: relevance + **recency decay** + **source authority** +
      engagement signal
- [ ] Neural reranker — ONNX ms-marco-MiniLM (port `ranker/reranker.py`)

---

## Phase 1 — Synthesis

- [ ] Cited AI answer block (port `ai_overview/generator.py`, streaming + retry)
- [ ] Current/dated synthesis (Baidu AI+ style: "as of <date>…")
- [ ] Theme clustering of results (Web Guide DNA: Releases / Benchmarks / Takes /
      Tutorials, auto-grouped per query)
- [ ] Inline citation provenance (click a claim → see the source)

---

## Phase 2 — Surface (the shippable Tier-2 product)

- [ ] Search hero + "Ask anything" input (AI Mode DNA)
- [ ] Answer block on top, clustered results below (Web Guide DNA)
- [ ] Content-type tabs: All / News / Papers / Releases / Discussion
- [ ] **Trending rail** — "what's hot in AI right now" (Baidu 热搜 DNA).
      Daily-habit hook; cheap relative to its pull. v1, not v2.
- [ ] Article detail / source view
- [ ] Beautiful + fast — table stakes, not optional. No one stays otherwise.

---

## Phase 3 — Flagship: signal-over-hype

- [ ] Signal score model (does this change anything?) per article/story
- [ ] Visible "Signal" / "Hype" badge on every item (screenshot-able)
- [ ] Rank-by-signal mode (toggle vs rank-by-recency)
- [ ] Shareable signal cards (distribution surface)

---

## Phase 4+ — Remaining Tier-3 pillars (one at a time)

- [ ] Story-as-unit: claim timelines, "how this story evolved"
- [ ] Source calibration by track record
- [ ] Disagreement surfacing in synthesis
- [ ] Reader memory: "what changed since you last looked" + weekly diff

---

## Reuse map (from `personal/projects/search-engine`)

| Component | Action | Source |
|-----------|--------|--------|
| Query engine | Port | `search/engine.py` |
| Hybrid retrieval | Port | `rag/retriever.py`, `rag/fanout.py` |
| BM25F | Port, retune | `ranker/bm25.py` |
| Neural reranker | Port | `ranker/reranker.py` |
| Chunker / embedder | Port | `rag/chunker.py`, `rag/embedder.py` |
| AI Overview | Port | `ai_overview/generator.py` |
| Job progress (WebSocket) | Port | `api/` |
| PageRank | Drop / de-weight | `ranker/pagerank.py` |
| BFS crawler | **Gut & rebuild** as ingestion loop | `crawler/` |

---

## Open decisions (not yet locked)

1. **Stack** — port FastAPI/Python + Next 16 (fastest, reuses engine) vs rebuild
   all-Next + Drizzle (single language, but rewrite retrieval/rerank, lose ONNX).
2. **v1 scope** — stop at search surface, or include conversational follow-up?
3. **Flagship pick** — signal-over-hype (recommended) vs story-as-unit.
4. **Trending in v1?** — recommended yes.
