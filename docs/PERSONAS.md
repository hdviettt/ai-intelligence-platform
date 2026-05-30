# Persona-tailored signal — design

**The thesis:** "signal" is meaningless without "for whom." A new RLHF paper is
9/10 for a researcher, 1/10 for an ecommerce owner. We can't tailor by *user data*
(we have none, never will at Google's scale) — so we tailor by *design*: declare
personas, encode what each cares about, and judge/rank/synthesize through that lens.

This turns the weakness (no users) into the strategy (an opinionated editorial lens).
Product reframes from "an AI search engine" to **"the AI intelligence brief for ___."**
First persona: **CEOs / business owners.**

## A persona is a lens, not a filter

We never *exclude* by persona (that fragments the corpus and drops valuable
crossover). We *reweight* and *reframe*. Everything stays searchable; the lens
changes order, emphasis, and the synthesis voice.

A persona touches three layers:
1. **Scoring** — the LLM judge scores each article's relevance *to this persona* +
   a one-line "so what for you" angle.
2. **Feed / ranking** — rank by `persona_signal`, not generic signal.
3. **Agent (synthesis)** — the AI Overview answers *as a brief to this persona*:
   consequence first, "what to do," jargon translated.

## Score model

Persona-INDEPENDENT (property of the article, scored once):
- `novelty`, `evidence`, `specificity`, `hype_markers` (0-10 each) → `substance`
- `hype_gap = normalized(engagement) − substance`  (attention minus substance;
  high = overhyped, very negative = buried signal). Engagement NEVER raises signal
  directly — it's the contrast axis. This is the philosophy.

Persona-RELATIVE (property of the (article, persona) pair):
- `relevance` (0-10): does this matter to this persona?
- `angle`: one sentence — the "so what for you."

Ranking:
```
persona_signal = substance · (relevance/10) · recency_decay   [· source_authority later]
```

## Cost: one call, all personas

One Groq call per article returns substance axes AND a relevance+angle for every
enabled persona. Adding a persona = another field in the same call, not another
scan. Pre-scored at ingest → feeds are instant. Resumable (only scores unscored
articles) so backfill and cron both work.

## Schema

- `personas` — key, name, identity, cares_about[], noise[], decision_lens,
  trusted_signals[], enabled. Seeded with `ceo`.
- `articles` — add `substance float`, `hype_gap float`, `signal_components jsonb`,
  `scored_at`.
- `article_persona_scores` — (article_id, persona_key) → relevance, angle, scored_at.

## Build order (vertical slice: CEO, end to end)

1. **Phase 1 (backend foundation):** persona config + schema + scoring judge.
   Backfill scores (recent/high-engagement first so the feed populates fast).
2. **Phase 2:** retrieval + synthesis become persona-aware; API takes `?persona=`.
3. **Phase 3:** UI — persona switcher (CEO live, others "coming soon"), feed +
   AI Overview through the lens, signal/relevance badge on cards.

Then adding Developer / Marketer / Ecommerce / Creative = write another persona
config row. That's the scalable payoff.

## Risks (named)

- **Persona definition is the new ground truth** — authored, not measured. It's the
  editorial spine; it deserves real care and versioning.
- **Over-tailoring starves the feed** — mitigated by reweight-not-exclude.
- **Judge consistency** — fixed rubric, temp 0; a hand-ranked golden set as a later
  checkpoint.
