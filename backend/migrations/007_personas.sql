-- Persona-tailored signal. Personas are data (managed like sources). Scores split
-- into persona-independent substance (on articles) and persona-relative relevance
-- (in article_persona_scores).

CREATE TABLE IF NOT EXISTS personas (
    id              SERIAL PRIMARY KEY,
    key             TEXT UNIQUE NOT NULL,         -- 'ceo'
    name            TEXT NOT NULL,                -- 'CEO / Business Owner'
    tagline         TEXT,                         -- short UI subtitle
    identity        TEXT NOT NULL,                -- who they are (for the judge)
    cares_about     JSONB NOT NULL DEFAULT '[]',  -- what's signal to them
    noise           JSONB NOT NULL DEFAULT '[]',  -- what's noise to them
    decision_lens   TEXT NOT NULL,                -- the one question that defines relevance
    trusted_signals JSONB NOT NULL DEFAULT '[]',  -- what they'd weight heavily
    voice           TEXT,                         -- how the agent should address them
    enabled         BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Persona-independent substance scores on the article itself.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS substance         REAL,
  ADD COLUMN IF NOT EXISTS hype_gap          REAL,
  ADD COLUMN IF NOT EXISTS signal_components JSONB,
  ADD COLUMN IF NOT EXISTS scored_at         TIMESTAMPTZ;

-- Persona-relative relevance + "so what" angle.
CREATE TABLE IF NOT EXISTS article_persona_scores (
    article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    persona_key TEXT NOT NULL,
    relevance   REAL NOT NULL DEFAULT 0,   -- 0-10
    angle       TEXT,                      -- one-line "so what for you"
    signal      REAL NOT NULL DEFAULT 0,   -- substance · relevance/10 · recency (precomputed)
    scored_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (article_id, persona_key)
);

CREATE INDEX IF NOT EXISTS idx_aps_persona_signal
    ON article_persona_scores (persona_key, signal DESC);
CREATE INDEX IF NOT EXISTS idx_articles_scored
    ON articles (scored_at);

-- Seed the first persona: CEO / business owner. All four facets the owner chose.
INSERT INTO personas (key, name, tagline, identity, cares_about, noise,
                      decision_lens, trusted_signals, voice, sort_order) VALUES
(
  'ceo',
  'CEO / Business Owner',
  'Strategy, money, and what to adopt now',
  'A CEO or owner of a tech-enabled company. Time-poor, decision-focused, thinks in quarters and competitive position, not implementation detail.',
  '["strategic and competitive moves (who is winning, major launches, market shifts, what competitors adopt)", "money (funding rounds, revenue milestones, pricing and cost shifts, margin impact, M&A)", "adopt-now vs ignore calls (is a tool/platform production-ready or hype, what to deploy)", "regulation, risk, governance, and the talent/hiring market"]',
  '["low-level implementation detail", "benchmark minutiae", "framework or tooling drama", "incremental research with no near-term business consequence"]',
  'Does this change a decision I would make in the next quarter — what to build, buy, fund, hire, adopt, or avoid?',
  '["enterprise adoption and named-company deployments", "funding and revenue figures", "pricing and unit-cost shifts", "regulation and policy", "moves by major labs and competitors"]',
  'Address them as a sharp, time-poor operator. Lead with the business consequence, then what to do about it. Translate technical jargon into impact. No hype, no filler.',
  10
)
ON CONFLICT (key) DO NOTHING;
