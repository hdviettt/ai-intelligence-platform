-- Daily/weekly intelligence briefing: one flowing narrative of what's new in AI
-- plus what it MEANS, grounded in the recent corpus with [n] citations. A briefing
-- is a SINGLE LLM call over the most recent, highest-signal articles, so it runs
-- cheaply and — unlike per-article scoring (thousands of calls) — is never blocked
-- by provider rate limits.

CREATE TABLE IF NOT EXISTS briefings (
    id            SERIAL PRIMARY KEY,
    kind          TEXT NOT NULL DEFAULT 'daily',   -- 'daily' | 'weekly'
    narrative     TEXT NOT NULL,                   -- flowing story with [n] markers
    citations     JSONB NOT NULL DEFAULT '[]',     -- [{n,title,url,source}]
    window_start  TIMESTAMPTZ,
    window_end    TIMESTAMPTZ,
    article_count INTEGER NOT NULL DEFAULT 0,
    provider      TEXT NOT NULL DEFAULT 'none',
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefings_kind_time
    ON briefings (kind, generated_at DESC);
