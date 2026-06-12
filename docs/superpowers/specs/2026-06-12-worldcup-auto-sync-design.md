# World Cup Auto-Sync + Revised Tipping — Design

**Date:** 2026-06-12
**App:** family-hub (Ozzy & Tommy)
**Status:** Approved design, pending implementation plan
**Supersedes parts of:** `2026-06-12-worldcup-tipping-design.md` (manual entry → automatic; tipping model revised)

## Summary

Iterate the shipped World Cup feature so that **nobody enters fixtures or
results by hand**. Fixtures, teams and scores are sourced automatically from a
free, keyless data feed. The two users just log in and tip upcoming matches; the
leaderboard updates itself.

Two changes from the shipped version:

1. **Auto-sourcing** — replace the manual Setup forms and manual result entry
   with an automatic sync from the openfootball public JSON.
2. **Revised tipping** — group stage stays simple (pick the winner); knockouts
   become exact-score predictions.

The scoring engine's structure, the sweepstakes layer, and the three-tab UI are
otherwise kept.

## Data source

**openfootball/worldcup.json** — public-domain JSON, **no API key, no signup**.

- Raw URL: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
- Structure: top-level `{ name, matches: [...] }`. Each match has `round`
  (e.g. "Matchday 1", "Round of 32"), `date` ("2026-06-11"), `time`
  ("13:00 UTC-6"), `team1`, `team2`, optional `score: { ft: [h, a], ht: [...] }`,
  `group` ("Group A") for group games, `num` (match number) for knockouts,
  `ground`.
- A match is **finished** iff it has `score.ft`.
- Knockout teams not yet decided appear as **placeholders**: `"1A"` (Group A
  winner), `"2B"` (Group B runner-up), `"W74"` (winner of match 74).
- Results are updated by volunteers, roughly **once a day** — accepted trade-off
  for zero setup.

## Sync architecture

**Client-side**, so there is no new infrastructure (no serverless function, no
cron job, no environment variables).

- `src/worldcup/feed.js` — **pure** mapping functions (no I/O), unit-tested:
  feed match → our row shape, round → stage, placeholder detection, kick-off
  parsing, favourites tagging.
- `src/worldcup/sync.js` — fetches the JSON, runs the pure mappers, diffs against
  what's already in Supabase, and upserts **only changes** (new fixtures, newly
  finished scores) via the shared `supabase` client.
- **Triggers:** automatically when the World Cup page mounts, plus a manual
  **🔄 Refresh** button. Whoever opens the app refreshes the shared data for both
  users (writes land in Supabase; realtime pushes to the other).

### Idempotency

`wc_matches` gains an `ext_key text unique` column so re-syncing updates the
existing row instead of inserting duplicates.
`ext_key = num` when present, else `"${date}|${team1}|${team2}"`.

### Mapping rules (feed → `wc_matches`)

| Field | Rule |
| --- | --- |
| `stage` | has `group` or round starts "Matchday" → `group`; round contains "32" → `r32`; "16" → `r16`; "Quarter" → `qf`; "Semi" → `sf`; exactly/contains "Final" (not Quarter/Semi) → `final`; "third"/"3rd" → **skipped** |
| `home_team` / `away_team` | `team1` / `team2` (may be a placeholder) |
| `kickoff` | parse `date` + `time` ("HH:MM UTC±N") → UTC `timestamptz` |
| `home_score` / `away_score` | `score.ft[0]` / `score.ft[1]` when present |
| `status` | `final` if `score.ft` present, else `scheduled` |
| `group_code` | `group` (e.g. "Group A" → "A") |

Placeholder detection: a team string matching `^\d[A-L]$`, `^W\d+$`, or
`^RU?\d` is **not** a real team.

### Teams

- The set of real (non-placeholder) `team1`/`team2` names across all matches is
  upserted into `wc_teams` (unique `name`).
- `is_favourite` set from the hard-coded `FAVOURITES` list.
- **Mains auto-assigned** if present in the field: Australia → Ozzy, England →
  Tommy (`role = "main"`). Dark-horse draw is run by the users as before.

## Revised tipping model

### Group stage — simple tipping
- Pick **Home / Draw / Away**. **1 point** for the correct result.
- Stored in `wc_tips.pick`.

### Knockouts — predict the exact score
- Predict `home`–`away`. Graded against the **full-time / extra-time score**
  (the score that took the match to penalties); **penalty shoot-outs are ignored
  for tip grading**.
- **3 points** — exact score. **1 point** — correct result (W/D/L of the FT
  score; a pens game counts as a draw), wrong score. **0** otherwise.
- Flat across all knockout rounds (no escalation).
- Stored in `wc_tips.pred_home` / `wc_tips.pred_away`.

### Locking
- A match locks for tipping when **now ≥ kickoff** (or it's already final).
- Knockout matches with placeholder teams are **not shown** for tipping until
  both real teams are known (via a later sync).

## Scoring engine changes (`src/worldcup/`)

- **Constants:** group correct outcome = **1**; knockout exact = **3**, knockout
  result = **1**. (Replaces the old per-round escalating `TIP_POINTS` for
  knockouts.)
- **New** `knockoutTipPoints(predHome, predAway, actualHome, actualAway)` →
  3 / 1 / 0 graded on the raw FT score.
- `tipTotal` dispatches by stage: group tips use the outcome path; knockout tips
  use the predicted-score path.
- All new logic is **pure and unit-tested** (TDD), matching the existing module.

## Sweepstakes (mostly unchanged)

- Scoring (group win/draw, reach knockouts, +5 per knockout round won, +25 cup
  win, dark-horse ×2) is unchanged.
- **Advancement is derived from the feed** so it's penalty-proof: a team that
  appears in a later knockout round advanced from the earlier one (counts as a
  round win). The champion is the winner of the final; if the final is level and
  decided on penalties, the feed's penalty data (`score.p`) is used when present.

## Schema changes (Supabase)

- `wc_matches`: add `ext_key text unique`.
- `wc_tips`: add `pred_home int`, `pred_away int` (nullable); make `pick`
  nullable (knockout tips have no outcome pick).
- RLS stays disabled; realtime already enabled on these tables.

## UI changes

- **Tip tab:** group matches show Home/Draw/Away buttons; knockout matches show
  two score inputs. Manual "Enter result" is **removed**. Locked matches show
  the tip + grading; matches with placeholder teams are hidden.
- **Setup ⚙️:** remove the add-team and add-match forms; keep the sweepstakes
  draw controls; add a **🔄 Sync now** button.
- **Leaderboard / My Teams:** unchanged.

## Out of scope (YAGNI)

- No paid API, no API key, no cron/serverless.
- No exact-score for the group stage; no escalation in the knockouts.
- No third-place play-off in tipping.
- No more than two users.

## Open trade-offs (accepted by user)

- Results lag up to ~a day (free source). ✅
- Group = simple, knockouts = predict score, flat 3/1. ✅
- Penalties don't affect tips; only used for sweepstakes advancement. ✅
