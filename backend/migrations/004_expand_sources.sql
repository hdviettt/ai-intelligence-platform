-- Horizontal + vertical scale: many more sources, deeper pulls.
-- All feed_urls live-probed working (scripts/probe_feeds.py). max_results set high
-- so deep-archive feeds (OpenAI ~978, HuggingFace ~788, etc.) backfill fully on
-- first run; the rss connector caps at whatever the feed actually returns.

-- Widen arXiv across the main AI/ML categories and pull deeper.
UPDATE ingest_sources
SET config = '{"categories": ["cs.AI","cs.LG","cs.CL","cs.CV","cs.NE","cs.MA","cs.IR","stat.ML","cs.RO","cs.HC"]}',
    max_results = 1500
WHERE name = 'arxiv';

-- HN: broaden query + pull deeper (Algolia paginates; connector handles it).
UPDATE ingest_sources
SET config = '{"query": "AI OR LLM OR GPT OR Claude OR Gemini OR \"language model\" OR \"neural network\" OR OpenAI OR Anthropic OR transformer OR diffusion", "min_points": 8}',
    max_results = 500
WHERE name = 'hackernews';

-- Deep pulls for the existing RSS rows.
UPDATE ingest_sources SET max_results = 1000 WHERE name = 'openai-blog';
UPDATE ingest_sources SET max_results = 1000 WHERE name = 'huggingface';
UPDATE ingest_sources SET max_results = 200  WHERE name = 'deepmind-blog';
UPDATE ingest_sources SET max_results = 100  WHERE name IN ('google-ai-blog','import-ai');

-- New sources (insert-ready set from the probe). ON CONFLICT keeps it idempotent.
INSERT INTO ingest_sources (name, connector, source_type, config, max_results) VALUES
  ('google-research',    'rss', 'release', '{"feed_url":"https://research.google/blog/rss/","base_url":"https://research.google"}', 200),
  ('microsoft-research', 'rss', 'release', '{"feed_url":"https://www.microsoft.com/en-us/research/feed/","base_url":"https://www.microsoft.com/en-us/research"}', 100),
  ('aws-ml-blog',        'rss', 'release', '{"feed_url":"https://aws.amazon.com/blogs/machine-learning/feed/","base_url":"https://aws.amazon.com"}', 100),
  ('nvidia-blog',        'rss', 'release', '{"feed_url":"https://blogs.nvidia.com/feed/","base_url":"https://blogs.nvidia.com"}', 100),
  ('apple-ml',           'rss', 'release', '{"feed_url":"https://machinelearning.apple.com/rss.xml","base_url":"https://machinelearning.apple.com"}', 100),
  ('bair-blog',          'rss', 'release', '{"feed_url":"https://bair.berkeley.edu/blog/feed.xml","base_url":"https://bair.berkeley.edu"}', 100),
  ('lilian-weng',        'rss', 'release', '{"feed_url":"https://lilianweng.github.io/index.xml","base_url":"https://lilianweng.github.io"}', 100),
  ('distill',            'rss', 'release', '{"feed_url":"https://distill.pub/rss.xml","base_url":"https://distill.pub"}', 100),
  ('sebastian-raschka',  'rss', 'release', '{"feed_url":"https://magazine.sebastianraschka.com/feed","base_url":"https://magazine.sebastianraschka.com"}', 100),
  ('jay-alammar',        'rss', 'release', '{"feed_url":"https://jalammar.github.io/feed.xml","base_url":"https://jalammar.github.io"}', 100),
  ('eugene-yan',         'rss', 'release', '{"feed_url":"https://eugeneyan.com/rss/","base_url":"https://eugeneyan.com"}', 300),
  ('chip-huyen',         'rss', 'release', '{"feed_url":"https://huyenchip.com/feed.xml","base_url":"https://huyenchip.com"}', 100),
  ('techcrunch-ai',      'rss', 'news', '{"feed_url":"https://techcrunch.com/category/artificial-intelligence/feed/","base_url":"https://techcrunch.com"}', 100),
  ('venturebeat-ai',     'rss', 'news', '{"feed_url":"https://venturebeat.com/category/ai/feed/","base_url":"https://venturebeat.com"}', 100),
  ('mit-tech-review-ai', 'rss', 'news', '{"feed_url":"https://www.technologyreview.com/topic/artificial-intelligence/feed","base_url":"https://www.technologyreview.com"}', 100),
  ('the-verge-ai',       'rss', 'news', '{"feed_url":"https://www.theverge.com/rss/ai-artificial-intelligence/index.xml","base_url":"https://www.theverge.com"}', 100),
  ('ars-technica-ai',    'rss', 'news', '{"feed_url":"https://arstechnica.com/ai/feed/","base_url":"https://arstechnica.com"}', 100),
  ('the-register-ai',    'rss', 'news', '{"feed_url":"https://www.theregister.com/software/ai_ml/headlines.atom","base_url":"https://www.theregister.com"}', 100),
  ('zdnet-ai',           'rss', 'news', '{"feed_url":"https://www.zdnet.com/topic/artificial-intelligence/rss.xml","base_url":"https://www.zdnet.com"}', 100),
  ('wired-ai',           'rss', 'news', '{"feed_url":"https://www.wired.com/feed/tag/ai/latest/rss","base_url":"https://www.wired.com"}', 100),
  ('ainews-smol',        'rss', 'news', '{"feed_url":"https://buttondown.com/ainews/rss","base_url":"https://buttondown.com"}', 100),
  ('semianalysis',       'rss', 'news', '{"feed_url":"https://www.semianalysis.com/feed","base_url":"https://www.semianalysis.com"}', 100),
  ('simonwillison',      'rss', 'news', '{"feed_url":"https://simonwillison.net/atom/everything/","base_url":"https://simonwillison.net"}', 100),
  ('ben-evans',          'rss', 'news', '{"feed_url":"https://www.ben-evans.com/benedictevans?format=rss","base_url":"https://www.ben-evans.com"}', 100),
  ('interconnects',      'rss', 'news', '{"feed_url":"https://www.interconnects.ai/feed","base_url":"https://www.interconnects.ai"}', 100),
  ('oneusefulthing',     'rss', 'news', '{"feed_url":"https://www.oneusefulthing.org/feed","base_url":"https://www.oneusefulthing.org"}', 100),
  ('reddit-ml',          'rss', 'discussion', '{"feed_url":"https://www.reddit.com/r/MachineLearning/.rss","base_url":"https://www.reddit.com"}', 100),
  ('reddit-localllama',  'rss', 'discussion', '{"feed_url":"https://www.reddit.com/r/LocalLLaMA/.rss","base_url":"https://www.reddit.com"}', 100),
  ('reddit-artificial',  'rss', 'discussion', '{"feed_url":"https://www.reddit.com/r/artificial/.rss","base_url":"https://www.reddit.com"}', 100),
  ('reddit-singularity', 'rss', 'discussion', '{"feed_url":"https://www.reddit.com/r/singularity/.rss","base_url":"https://www.reddit.com"}', 100)
ON CONFLICT (name) DO NOTHING;
