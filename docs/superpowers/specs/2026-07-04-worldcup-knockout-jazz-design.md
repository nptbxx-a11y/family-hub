# World Cup — Knockout-Stage Jazz + Declutter

**Date:** 2026-07-04
**App:** family-hub (Ozzy & Tommy)
**Status:** Approved design (mockup approved), pending build
**Builds on:** the shipped auto-sync World Cup feature

## Summary

Presentation-only refresh of the World Cup page for the knockout stage. No
changes to rules, scoring, schema, or the data sync. Two goals:

1. **Declutter** — the Tip tab now lists all ~103 matches (72 finished group
   games first). Add a filter so the live action is front and centre.
2. **Jazz** — a blend of broadcast-premium styling, a bracket motif, and a
   playful celebratory touch.

## Declutter

A segmented filter at the top of the Tip tab with three views:

- **⚡ To tip** (default) — upcoming matches with two real teams that haven't
  kicked off yet, soonest first. The action list.
- **🏆 Knockouts** — all knockout matches with real teams (R32→Final), ordered
  by round then kick-off. Upcoming and finished together (the bracket view).
- **✓ Results** — finished matches, newest first. The 72 group-stage results
  sit behind a collapsed **"Group stage results (72)"** expander; finished
  knockout games show expanded.

"Real teams" means neither side is a placeholder (`isPlaceholderTeam`).

## Jazz

- **Dynamic hero subtitle** — switches with the tournament phase: "Group stage ·
  pick the winners" → "Knockout stage · road to the final" → "The final · road's
  end" → "Champions crowned 🏆".
- **Bracket progress strip** — compact `R32 › R16 › QF › SF › 🏆 Final` row with
  the current round lit in gold. Shown above the filter on the Tip tab.
- **Mini leaderboard** — two compact cards (Ozzy / Tommy) pinned above the
  filter, gold border on whoever leads. Reuses the same scoring as the
  Leaderboard tab.
- **Premium match cards** — round badge, gold-accented border on knockout cards,
  flags beside the score boxes (already present), tighter hierarchy.
- **Celebratory hit** — on a finished match, a correct tip shows a green
  "🎉 +N" pill; a miss shows a muted "✗".

## Components / files

**New (pure, tested):**
- `src/worldcup/phase.js` — `currentRound(matches)` and `phaseLabel(matches)`.
- `src/worldcup/phase.test.js`.

**New (UI):**
- `src/components/WorldCupBracketStrip.jsx` — the R32→Final progress strip.

**Modified:**
- `src/worldcup/scoring.js` — extract `standings({teams,matches,tips})` (shared
  by the Leaderboard tab and the new mini leaderboard); add a test. This also
  de-duplicates the row-building currently inline in the Leaderboard.
- `src/worldcup/scoring.test.js` — test `standings`.
- `src/components/WorldCupTip.jsx` — filter state + three views, bracket strip,
  mini leaderboard, group-results collapse, celebratory grading pills.
- `src/components/WorldCupLeaderboard.jsx` — use `standings()`.
- `src/components/WorldCup.jsx` — dynamic hero subtitle via `phaseLabel`.
- `src/components/WorldCup.css` — filter, bracket strip, mini leaderboard,
  premium/celebratory card styles, collapse.

## Constraints

- All on the existing dark aurora tokens (`--surface`, `--accent`, `--yellow`,
  `--purple`, `--text`). Respect `prefers-reduced-motion`.
- Pure logic (`phase`, `standings`) unit-tested with Vitest; UI verified by
  lint + build (the page is login-gated so no automated UI test).
- No schema/scoring/sync changes.

## Out of scope (YAGNI)

- No full bracket tree (won't fit a phone); the strip conveys progress instead.
- No new data, no third-place play-off, no settings changes.
