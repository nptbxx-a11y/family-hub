# World Cup Tipping + Sweepstakes — Design

**Date:** 2026-06-12
**App:** family-hub (Ozzy & Tommy)
**Status:** Approved design, pending implementation plan

## Summary

A new page in family-hub for the 2026 World Cup that combines two layers of fun
for the two users:

1. **Tipping** — predict the outcome of each match (Home win / Draw / Away win)
   and earn points for correct calls.
2. **Sweepstakes** — each user owns 3 teams (one self-chosen "main" team plus
   two randomly drawn dark horses) and earns bonus points as those teams win and
   advance.

A live Ozzy-vs-Tommy leaderboard runs the length of the tournament.

## The two layers

### Tipping (main game)

- Before each match with a known fixture, both users pick the outcome:
  **Home win / Draw / Away win**.
- All group-stage fixtures are tippable immediately. Knockout matches become
  tippable only once both teams are confirmed (we can't tip a fixture that
  doesn't exist yet).
- A tip locks at kick-off (or when the result is entered) and cannot be changed.
- Points are awarded automatically when a result is entered.

### Sweepstakes (luck layer)

- Each user owns **3 teams**: one **main** team (self-chosen) plus **2 dark
  horses** (randomly drawn).
  - **Ozzy:** Australia (main) + 2 dark horses
  - **Tommy:** England (main) + 2 dark horses
- Teams earn the owner bonus points as they win matches and advance rounds.

#### The dark-horse draw

- The 2 dark horses per user are drawn at random from a **curated underdog
  pool** — the tournament favourites are excluded (e.g. Spain, France,
  Argentina, Brazil, Portugal, Germany, Netherlands), as are the two main teams.
- Implemented as a one-time **"🎲 Draw teams"** action that assigns 2 teams to
  each user with no overlap between users.
- The pair can re-roll together until happy, then **lock** the draw.
- The team list (all 48) and the favourites/underdog split are populated via
  manual entry, since exact qualification is not assumed.

## Scoring

All point values are configurable constants in one place so they're easy to
tweak.

### Tipping — points per correct outcome (escalating in knockouts)

| Stage          | Points |
| -------------- | ------ |
| Group stage    | 1      |
| Round of 32    | 2      |
| Round of 16    | 3      |
| Quarter-final  | 5      |
| Semi-final     | 8      |
| Final          | 13     |

### Sweepstakes — bonus when an owned team does well

- Owned team **wins** a group match: **+2** (a draw: **+1**)
- Owned team **reaches the knockouts**: **+5**
- Owned team **wins a knockout round**: **+5 per round**
- Owned team **wins the World Cup**: **+25**
- **Underdog twist (optional, default ON):** dark-horse teams earn **double**
  sweepstakes bonuses, rewarding the risk. Main teams score single.

## Data entry & flow

- **Manual entry**, mirroring the existing Battleships pattern. No external API.
- Fixtures are set up once (group stage now; knockout matches added as they're
  confirmed).
- One user enters a match result. On save, the app:
  1. Resolves both users' tips for that match → awards tipping points.
  2. Applies any sweepstakes bonuses for owned teams in that match.
  3. Updates the live leaderboard.
- All updates are realtime-synced between the two users (Supabase channels),
  matching the app's established pattern.

## UI

- New route **`/worldcup`** with three tabs:
  - **Tip** — list of upcoming/known matches with Home / Draw / Away pick
    controls; shows whether each user has tipped and locks past matches.
  - **Leaderboard** — running totals for Ozzy and Tommy with a breakdown
    (tipping points vs sweepstakes points).
  - **My Teams** — each user's 3 teams and how they're performing
    (results, advancement, points earned).
- New link added to the hamburger sidebar.
- Visual design built with the frontend-design skill and refined with the
  impeccable polish skills, themed to the World Cup while staying consistent
  with the family-hub look. Layout includes clearly defined image "slots" so
  externally generated artwork (e.g. a hero banner) can be dropped in later.

## Data model (Supabase)

Three new tables, **RLS disabled**, **realtime enabled**, following the existing
convention.

### `wc_teams`

| column      | type | notes                                          |
| ----------- | ---- | ---------------------------------------------- |
| id          | uuid | pk                                             |
| name        | text | e.g. "Australia"                               |
| group_code  | text | e.g. "A" (nullable)                            |
| is_favourite| bool | excluded from the dark-horse pool when true    |
| owner       | text | "ozzy" \| "tommy" \| null                      |
| role        | text | "main" \| "darkhorse" \| null                  |
| eliminated  | bool | tracks knockout progress for My Teams view     |
| created_at  | timestamptz |                                         |

### `wc_matches`

| column       | type | notes                                              |
| ------------ | ---- | -------------------------------------------------- |
| id           | uuid | pk                                                 |
| stage        | text | "group" \| "r32" \| "r16" \| "qf" \| "sf" \| "final" |
| home_team    | text | team name (or id reference)                        |
| away_team    | text | team name (or id reference)                        |
| kickoff      | timestamptz | nullable                                    |
| home_score   | int  | null until result entered                          |
| away_score   | int  | null until result entered                          |
| status       | text | "scheduled" \| "final"                             |
| created_at   | timestamptz |                                             |

### `wc_tips`

| column       | type | notes                                       |
| ------------ | ---- | ------------------------------------------- |
| id           | uuid | pk                                          |
| match_id     | uuid | fk → wc_matches                             |
| user_name    | text | "ozzy" \| "tommy"                           |
| pick         | text | "home" \| "draw" \| "away"                  |
| points       | int  | awarded once the match is final (default 0) |
| created_at   | timestamptz |                                      |

Sweepstakes bonus points can be derived on read from `wc_matches` +
`wc_teams`, or stored on a small `wc_scores` summary — to be decided in the
implementation plan. Default approach: derive on read to avoid double-counting.

## Out of scope (YAGNI)

- No external football API / auto-results.
- No exact-score tipping (outcome only).
- No more than two users.
- No pre-filled full knockout bracket — matches are tipped as fixtures appear.

## Open knobs (confirmed with user)

- Dark-horse draw: random from curated underdog pool. ✅
- Point values: per the tables above (adjustable). ✅
- Underdog double-bonus twist: **ON**. Dark-horse teams score double on all
  sweepstakes bonuses (e.g. a dark horse winning the Cup = +50). Confirmed.
