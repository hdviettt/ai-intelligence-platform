-- Fix the two infinite sources after live diagnosis:
--  - HN: complex multi-OR + quoted query returns 0 from Algolia. Use a LIST of
--    simple queries (each paginates), deduped by the connector.
--  - arXiv: deep pulls now go through the paginated export API (max_results > 100).

UPDATE ingest_sources
SET config = '{"queries": ["LLM","GPT","Claude AI","Gemini","OpenAI","Anthropic","language model","neural network","transformer model","diffusion model","AI agent","fine-tuning"], "min_points": 8}',
    max_results = 1200
WHERE name = 'hackernews';

-- arXiv: keep the wide category set; max_results > 100 triggers the export-API
-- paginated path in the connector.
UPDATE ingest_sources
SET max_results = 2000
WHERE name = 'arxiv';
