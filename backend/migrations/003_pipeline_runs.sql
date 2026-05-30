-- Batch-level record of each pipeline trigger, so /admin can show corpus growth
-- over time and exactly what each trigger added.

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id           SERIAL PRIMARY KEY,
    trigger      TEXT NOT NULL DEFAULT 'manual',  -- cron | admin | cli | baseline
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ,
    total_before INTEGER NOT NULL DEFAULT 0,       -- article count before the run
    total_after  INTEGER NOT NULL DEFAULT 0,       -- article count after
    inserted     INTEGER NOT NULL DEFAULT 0,       -- new articles this run
    updated      INTEGER NOT NULL DEFAULT 0,       -- re-seen articles this run
    embedded     INTEGER NOT NULL DEFAULT 0,       -- articles embedded this run
    chunks_after INTEGER NOT NULL DEFAULT 0,       -- chunk count after
    per_source   JSONB NOT NULL DEFAULT '[]'       -- [{source, fetched, inserted, updated, error}]
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_finished ON pipeline_runs (finished_at DESC);

-- Anchor the growth chart with the current corpus size, so the first real trigger
-- shows as growth from a known baseline rather than from zero.
INSERT INTO pipeline_runs (trigger, finished_at, total_before, total_after, chunks_after)
SELECT 'baseline', now(), 0,
       (SELECT count(*) FROM articles),
       (SELECT count(*) FROM chunks)
WHERE NOT EXISTS (SELECT 1 FROM pipeline_runs);
