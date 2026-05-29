-- Make ingest sources data-driven so they can be managed from the admin panel.
-- Connector = how to fetch; config = connector-specific params (JSONB).

CREATE TABLE IF NOT EXISTS ingest_sources (
    id          SERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,        -- 'openai-blog'
    connector   TEXT NOT NULL,               -- 'rss' | 'arxiv' | 'hackernews'
    source_type TEXT NOT NULL,               -- paper | release | news | discussion
    config      JSONB NOT NULL DEFAULT '{}', -- rss: {feed_url, base_url}
                                             -- arxiv: {categories: [...]}
                                             -- hackernews: {query, min_points}
    max_results INTEGER NOT NULL DEFAULT 30,
    enabled     BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with the sources that were hardcoded in the connectors, so behaviour is
-- unchanged after the refactor. Idempotent.
INSERT INTO ingest_sources (name, connector, source_type, config, max_results) VALUES
  ('arxiv',          'arxiv',      'paper',
     '{"categories": ["cs.AI", "cs.LG", "cs.CL"]}', 50),
  ('hackernews',     'hackernews', 'discussion',
     '{"query": "AI OR LLM OR GPT OR Claude OR Gemini", "min_points": 5}', 50),
  ('openai-blog',    'rss', 'release',
     '{"feed_url": "https://openai.com/news/rss.xml", "base_url": "https://openai.com"}', 30),
  ('deepmind-blog',  'rss', 'release',
     '{"feed_url": "https://deepmind.google/blog/rss.xml", "base_url": "https://deepmind.google"}', 30),
  ('huggingface',    'rss', 'release',
     '{"feed_url": "https://huggingface.co/blog/feed.xml", "base_url": "https://huggingface.co"}', 30),
  ('google-ai-blog', 'rss', 'news',
     '{"feed_url": "https://blog.google/technology/ai/rss", "base_url": "https://blog.google"}', 20),
  ('import-ai',      'rss', 'news',
     '{"feed_url": "https://importai.substack.com/feed", "base_url": "https://importai.substack.com"}', 20)
ON CONFLICT (name) DO NOTHING;
