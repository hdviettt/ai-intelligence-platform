-- Structured briefing (Google Web Guide style): a short lede plus themed threads,
-- each thread grouping source citations under an AI-written heading + description.
-- The legacy `narrative` column stays (populated with a plaintext fallback) so old
-- clients keep working during rollout.

ALTER TABLE briefings
    ADD COLUMN IF NOT EXISTS lede    TEXT,
    ADD COLUMN IF NOT EXISTS threads JSONB NOT NULL DEFAULT '[]';
