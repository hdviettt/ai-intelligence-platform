-- Anchor briefings to a persona: each briefing is written through one persona's
-- lens (a CEO's brief reads differently from a developer's). Existing rows default
-- to 'ceo'. The latest-per-(kind,persona) lookup gets its own index.

ALTER TABLE briefings
    ADD COLUMN IF NOT EXISTS persona_key TEXT NOT NULL DEFAULT 'ceo';

CREATE INDEX IF NOT EXISTS idx_briefings_persona_time
    ON briefings (kind, persona_key, generated_at DESC);
