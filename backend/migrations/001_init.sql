-- ai-search-experience — initial schema
-- The corpus is the AI beat: papers, news, releases, discussion.

CREATE EXTENSION IF NOT EXISTS vector;

-- Source registry. Weight feeds later track-record calibration (Tier-3).
CREATE TABLE IF NOT EXISTS sources (
    id          SERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,     -- 'arxiv', 'hackernews', 'openai-blog'
    kind        TEXT NOT NULL,            -- 'paper' | 'news' | 'release' | 'discussion'
    base_url    TEXT,
    weight      REAL NOT NULL DEFAULT 1.0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The unit of the corpus (v1). Story-as-unit (Tier-3) layers on top later.
CREATE TABLE IF NOT EXISTS articles (
    id            SERIAL PRIMARY KEY,
    url           TEXT UNIQUE NOT NULL,
    title         TEXT NOT NULL,
    summary       TEXT,                    -- source-provided abstract / snippet
    body          TEXT,                    -- extracted readable content
    author        TEXT,
    source        TEXT NOT NULL REFERENCES sources(name),
    source_type   TEXT NOT NULL,           -- paper | news | release | discussion
    published_at  TIMESTAMPTZ,
    fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    lang          TEXT DEFAULT 'en',
    external_score REAL DEFAULT 0,         -- HN points, etc. (engagement signal)
    content_hash  TEXT,                    -- dedup across sources
    raw           JSONB,                   -- original payload, for reprocessing
    embedding     vector(512),             -- article-level (title + summary)
    -- Native inverted index: weighted tsvector, title boosted over body.
    tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'C')
    ) STORED
);

-- RAG chunks for grounded synthesis.
CREATE TABLE IF NOT EXISTS chunks (
    id           SERIAL PRIMARY KEY,
    article_id   INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    chunk_index  INTEGER NOT NULL,
    content      TEXT NOT NULL,
    embedding    vector(512),
    UNIQUE (article_id, chunk_index)
);

-- Ingestion run log.
CREATE TABLE IF NOT EXISTS ingest_runs (
    id          SERIAL PRIMARY KEY,
    source      TEXT NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    fetched     INTEGER DEFAULT 0,
    inserted    INTEGER DEFAULT 0,
    updated     INTEGER DEFAULT 0,
    error       TEXT
);

-- Inverted index (keyword) + ANN (semantic) + lookups.
CREATE INDEX IF NOT EXISTS idx_articles_tsv        ON articles USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_articles_embedding  ON articles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding    ON chunks   USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_articles_published  ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source     ON articles (source);
CREATE INDEX IF NOT EXISTS idx_articles_type       ON articles (source_type);
