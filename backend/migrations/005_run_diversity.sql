-- Track corpus DIVERSITY per run, not just depth. Depth = total_after/chunks_after
-- (already recorded). Diversity = how many distinct sources are live and how the
-- corpus is spread across themes. Lets /admin show the index getting both bigger
-- and broader over time.

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS distinct_sources INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS theme_breakdown  JSONB   NOT NULL DEFAULT '{}';
  -- theme_breakdown: {"Research": 120, "Releases": 93, ...} as of this run

-- Backfill the existing rows (baseline + any prior) with the current snapshot so
-- the diversity chart has a sensible starting point.
UPDATE pipeline_runs
SET distinct_sources = (SELECT count(DISTINCT source) FROM articles),
    theme_breakdown = COALESCE((
        SELECT jsonb_object_agg(theme, n) FROM (
            SELECT CASE source_type
                     WHEN 'paper' THEN 'Research'
                     WHEN 'release' THEN 'Releases'
                     WHEN 'news' THEN 'News'
                     WHEN 'discussion' THEN 'Discussion'
                     ELSE 'Other' END AS theme,
                   count(*) AS n
            FROM articles GROUP BY 1
        ) t
    ), '{}'::jsonb)
WHERE distinct_sources = 0;
