# World Cup Tipping + Sweepstakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/worldcup` page to family-hub where Ozzy & Tommy tip match outcomes and run a 3-team-per-user sweepstakes, with a live leaderboard.

**Architecture:** Three new Supabase tables (RLS off, realtime on) following the app's existing fetch-on-mount + realtime-channel pattern. All scoring lives in a pure, unit-tested `src/worldcup/` module so the React components stay thin. One page component with three tabs (Tip / Leaderboard / My Teams) plus a small Setup panel for manual data entry. Wired into the existing lazy-route shell and hamburger sidebar.

**Tech Stack:** React 19 + Vite, React Router v7, framer-motion, Supabase JS client. Vitest added for the pure logic only.

**Spec:** `docs/superpowers/specs/2026-06-12-worldcup-tipping-design.md`

**Testing adaptation:** The project has no test runner (`CLAUDE.md`: "There are no tests configured"). Pure logic in `src/worldcup/` is tested with Vitest (`npx vitest run`). UI tasks are verified with `npm run lint`, `npm run build`, and manual dev-server checks — no React test framework is introduced (YAGNI for a two-user app).

---

## File Structure

**New files:**
- `src/worldcup/constants.js` — tunable config: owners, main teams, stages, point values, favourites. Single source of truth.
- `src/worldcup/scoring.js` — pure functions: outcome/winner resolution, tip points, sweepstakes points, totals.
- `src/worldcup/scoring.test.js` — Vitest tests for scoring.
- `src/worldcup/draw.js` — pure dark-horse draw (Fisher–Yates with injectable RNG).
- `src/worldcup/draw.test.js` — Vitest tests for the draw.
- `src/worldcup/db.js` — thin Supabase data helpers (fetch teams/matches/tips, insert/update).
- `src/components/WorldCup.jsx` — page shell: tab state, shared data fetch + realtime, Setup button.
- `src/components/WorldCupTip.jsx` — Tip tab: list matches, make a pick, enter a result.
- `src/components/WorldCupLeaderboard.jsx` — Leaderboard tab: totals + breakdown.
- `src/components/WorldCupTeams.jsx` — My Teams tab: each user's 3 teams and their points.
- `src/components/WorldCupSetup.jsx` — modal: add teams, add matches, run/lock the draw.
- `src/components/WorldCup.css` — all styles for the above.

**Modified files:**
- `src/App.jsx` — lazy import + `<Route path="/worldcup">`.
- `src/components/NavBar.jsx` — sidebar `<NavLink>`.
- `package.json` — add `vitest` dev dependency + `test` script.

**Supabase:** new tables `wc_teams`, `wc_matches`, `wc_tips`.

---

## Task 1: Database schema

**Files:** Supabase only (no repo files). Apply via the Supabase MCP (`apply_migration`) or the SQL editor.

- [ ] **Step 1: Create the three tables (RLS disabled, realtime enabled)**

Run this SQL (migration name `worldcup_tables`):

```sql
create table if not exists wc_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  group_code text,
  is_favourite boolean not null default false,
  owner text,            -- 'Ozzy' | 'Tommy' | null
  role text,             -- 'main' | 'darkhorse' | null
  created_at timestamptz not null default now()
);

create table if not exists wc_matches (
  id uuid primary key default gen_random_uuid(),
  stage text not null,        -- 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  group_code text,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz,
  home_score int,
  away_score int,
  winner_team text,           -- only for knockout matches level after 90 (penalties)
  status text not null default 'scheduled',  -- 'scheduled' | 'final'
  created_at timestamptz not null default now()
);

create table if not exists wc_tips (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references wc_matches(id) on delete cascade,
  user_name text not null,    -- 'Ozzy' | 'Tommy'
  pick text not null,         -- 'home' | 'draw' | 'away'
  created_at timestamptz not null default now(),
  unique (match_id, user_name)
);

-- Project convention: RLS stays OFF.
alter table wc_teams disable row level security;
alter table wc_matches disable row level security;
alter table wc_tips disable row level security;

-- Realtime, matching the other tables in the app.
alter publication supabase_realtime add table wc_teams;
alter publication supabase_realtime add table wc_matches;
alter publication supabase_realtime add table wc_tips;
```

- [ ] **Step 2: Verify the tables exist**

Use the Supabase MCP `list_tables` (schema `public`).
Expected: `wc_teams`, `wc_matches`, `wc_tips` all present with RLS disabled.

- [ ] **Step 3: No commit** — schema is not in the repo. Note completion in the task tracker.

---

## Task 2: Vitest setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vitest as a dev dependency**

Run: `npm install -D vitest`
Expected: `vitest` appears under `devDependencies`, install completes with no errors.

- [ ] **Step 2: Add a `test` script**

In `package.json`, add to the `"scripts"` block (keep existing scripts):

```json
"test": "vitest run"
```

- [ ] **Step 3: Verify the runner works (no tests yet)**

Run: `npx vitest run`
Expected: exits 0 with "No test files found" (acceptable at this stage).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest for World Cup scoring tests"
```

---

## Task 3: Constants module

**Files:**
- Create: `src/worldcup/constants.js`

- [ ] **Step 1: Write the constants**

```js
// src/worldcup/constants.js
// Single source of truth for all tunable World Cup game config.

export const OWNERS = ["Ozzy", "Tommy"];

// Each owner's self-chosen main team.
export const MAIN_TEAMS = { Ozzy: "Australia", Tommy: "England" };

// Tournament stages in order.
export const STAGES = ["group", "r32", "r16", "qf", "sf", "final"];

export const STAGE_LABELS = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  final: "Final",
};

// Points for a CORRECT outcome tip, per stage (escalates in the knockouts).
export const TIP_POINTS = {
  group: 1,
  r32: 2,
  r16: 3,
  qf: 5,
  sf: 8,
  final: 13,
};

// Sweepstakes bonuses for an OWNED team.
export const SWEEP = {
  groupWin: 2,
  groupDraw: 1,
  reachKnockouts: 5,
  knockoutRoundWin: 5,
  winTournament: 25,
};

// Dark-horse teams score double on all sweepstakes bonuses.
export const DARK_HORSE_MULTIPLIER = 2;

// Tournament favourites — excluded from the dark-horse draw pool.
export const FAVOURITES = [
  "Spain",
  "France",
  "Argentina",
  "Brazil",
  "Portugal",
  "Germany",
  "Netherlands",
  "England",
];
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `node --input-type=module -e "import('./src/worldcup/constants.js').then(m => console.log(Object.keys(m)))"`
Expected: prints the exported names including `OWNERS`, `TIP_POINTS`, `SWEEP`.

- [ ] **Step 3: Commit**

```bash
git add src/worldcup/constants.js
git commit -m "feat(worldcup): add scoring constants"
```

---

## Task 4: Outcome + tip scoring (TDD)

**Files:**
- Create: `src/worldcup/scoring.js`
- Test: `src/worldcup/scoring.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/worldcup/scoring.test.js
import { describe, it, expect } from "vitest";
import {
  outcomeFromScore,
  matchWinner,
  resultForTip,
  tipPoints,
} from "./scoring.js";

describe("outcomeFromScore", () => {
  it("returns home/away/draw", () => {
    expect(outcomeFromScore(2, 1)).toBe("home");
    expect(outcomeFromScore(0, 3)).toBe("away");
    expect(outcomeFromScore(1, 1)).toBe("draw");
  });
  it("returns null when a score is missing", () => {
    expect(outcomeFromScore(null, 1)).toBe(null);
    expect(outcomeFromScore(2, undefined)).toBe(null);
  });
});

describe("matchWinner", () => {
  const base = { home_team: "A", away_team: "B", status: "final" };
  it("derives from score", () => {
    expect(matchWinner({ ...base, home_score: 2, away_score: 0 })).toBe("A");
    expect(matchWinner({ ...base, home_score: 0, away_score: 2 })).toBe("B");
  });
  it("uses winner_team for a level knockout (penalties)", () => {
    expect(
      matchWinner({ ...base, home_score: 1, away_score: 1, winner_team: "B" })
    ).toBe("B");
  });
  it("is null for an unfinished match", () => {
    expect(matchWinner({ ...base, status: "scheduled" })).toBe(null);
  });
});

describe("resultForTip", () => {
  it("group: raw outcome including draw", () => {
    expect(
      resultForTip({ stage: "group", status: "final", home_team: "A", away_team: "B", home_score: 1, away_score: 1 })
    ).toBe("draw");
  });
  it("knockout: maps decisive winner to home/away", () => {
    expect(
      resultForTip({ stage: "qf", status: "final", home_team: "A", away_team: "B", home_score: 1, away_score: 1, winner_team: "A" })
    ).toBe("home");
  });
});

describe("tipPoints", () => {
  it("awards stage points for a correct pick", () => {
    expect(tipPoints("group", "home", "home")).toBe(1);
    expect(tipPoints("final", "away", "away")).toBe(13);
  });
  it("awards nothing for a wrong or missing pick", () => {
    expect(tipPoints("group", "home", "away")).toBe(0);
    expect(tipPoints("group", null, "home")).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/worldcup/scoring.test.js`
Expected: FAIL — `scoring.js` does not export these yet.

- [ ] **Step 3: Implement the functions**

```js
// src/worldcup/scoring.js
import { TIP_POINTS } from "./constants.js";

// "home" | "away" | "draw" | null
export function outcomeFromScore(homeScore, awayScore) {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

// The team name that won, or null if not final / a true draw.
export function matchWinner(match) {
  if (!match || match.status !== "final") return null;
  if (match.winner_team) return match.winner_team;
  const r = outcomeFromScore(match.home_score, match.away_score);
  if (r === "home") return match.home_team;
  if (r === "away") return match.away_team;
  return null;
}

// The outcome a tip is graded against: groups use raw score; knockouts use
// the decisive winner (penalties resolved), mapped back to home/away.
export function resultForTip(match) {
  if (!match || match.status !== "final") return null;
  if (match.stage === "group") {
    return outcomeFromScore(match.home_score, match.away_score);
  }
  const w = matchWinner(match);
  if (!w) return outcomeFromScore(match.home_score, match.away_score);
  return w === match.home_team ? "home" : "away";
}

// Points a single tip earns.
export function tipPoints(stage, pick, result) {
  if (!pick || !result || pick !== result) return 0;
  return TIP_POINTS[stage] ?? 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/worldcup/scoring.test.js`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/worldcup/scoring.js src/worldcup/scoring.test.js
git commit -m "feat(worldcup): add outcome + tip scoring with tests"
```

---

## Task 5: Sweepstakes scoring + totals (TDD)

**Files:**
- Modify: `src/worldcup/scoring.js`
- Modify: `src/worldcup/scoring.test.js`

- [ ] **Step 1: Add failing tests**

Append to `src/worldcup/scoring.test.js`:

```js
import {
  groupMatchBonus,
  reachedKnockouts,
  sweepstakesPoints,
  tipTotal,
} from "./scoring.js";

describe("groupMatchBonus", () => {
  const m = (o) => ({ stage: "group", status: "final", home_team: "AUS", away_team: "X", ...o });
  it("rewards a win and a draw", () => {
    expect(groupMatchBonus("AUS", m({ home_score: 2, away_score: 0 }))).toBe(2);
    expect(groupMatchBonus("AUS", m({ home_score: 1, away_score: 1 }))).toBe(1);
  });
  it("gives nothing for a loss or an unrelated match", () => {
    expect(groupMatchBonus("AUS", m({ home_score: 0, away_score: 1 }))).toBe(0);
    expect(groupMatchBonus("AUS", m({ home_team: "Y", home_score: 3, away_score: 0 }))).toBe(0);
  });
});

describe("reachedKnockouts", () => {
  it("is true when the team appears in any knockout fixture", () => {
    const matches = [{ stage: "r32", home_team: "AUS", away_team: "Z" }];
    expect(reachedKnockouts("AUS", matches)).toBe(true);
    expect(reachedKnockouts("Q", matches)).toBe(false);
  });
});

describe("sweepstakesPoints", () => {
  // AUS: wins a group game (+2), reaches knockouts (+5), wins R32 (+5) = 12
  const matches = [
    { stage: "group", status: "final", home_team: "AUS", away_team: "X", home_score: 1, away_score: 0 },
    { stage: "r32", status: "final", home_team: "AUS", away_team: "Z", home_score: 2, away_score: 1 },
  ];
  it("totals a main team's bonuses at single rate", () => {
    expect(sweepstakesPoints("AUS", "main", matches)).toBe(12);
  });
  it("doubles a dark horse's bonuses", () => {
    expect(sweepstakesPoints("AUS", "darkhorse", matches)).toBe(24);
  });
});

describe("tipTotal", () => {
  const matches = [
    { id: "1", stage: "group", status: "final", home_team: "A", away_team: "B", home_score: 2, away_score: 0 },
    { id: "2", stage: "final", status: "final", home_team: "A", away_team: "B", home_score: 1, away_score: 1, winner_team: "A" },
  ];
  const tips = [
    { match_id: "1", user_name: "Ozzy", pick: "home" }, // +1
    { match_id: "2", user_name: "Ozzy", pick: "home" }, // +13 (knockout winner = home)
    { match_id: "1", user_name: "Tommy", pick: "draw" }, // +0
  ];
  it("sums a user's correct tips across stages", () => {
    expect(tipTotal("Ozzy", tips, matches)).toBe(14);
    expect(tipTotal("Tommy", tips, matches)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/worldcup/scoring.test.js`
Expected: FAIL — new exports not defined.

- [ ] **Step 3: Implement the functions**

Append to `src/worldcup/scoring.js`:

```js
import { SWEEP, DARK_HORSE_MULTIPLIER } from "./constants.js";

// Bonus for an owned team in one finished GROUP match.
export function groupMatchBonus(teamName, match) {
  if (!match || match.stage !== "group" || match.status !== "final") return 0;
  const isHome = match.home_team === teamName;
  const isAway = match.away_team === teamName;
  if (!isHome && !isAway) return 0;
  const result = outcomeFromScore(match.home_score, match.away_score);
  if (result === "draw") return SWEEP.groupDraw;
  if ((isHome && result === "home") || (isAway && result === "away")) return SWEEP.groupWin;
  return 0;
}

// True if the team appears in any knockout-stage fixture (scheduled or final).
export function reachedKnockouts(teamName, matches) {
  return matches.some(
    (m) => m.stage !== "group" && (m.home_team === teamName || m.away_team === teamName)
  );
}

// Total sweepstakes points for one owned team. role: "main" | "darkhorse".
export function sweepstakesPoints(teamName, role, matches) {
  let pts = 0;
  for (const m of matches) pts += groupMatchBonus(teamName, m);
  if (reachedKnockouts(teamName, matches)) pts += SWEEP.reachKnockouts;
  for (const m of matches) {
    if (m.stage !== "group" && m.status === "final" && matchWinner(m) === teamName) {
      pts += SWEEP.knockoutRoundWin;
    }
  }
  const finalMatch = matches.find((m) => m.stage === "final" && m.status === "final");
  if (finalMatch && matchWinner(finalMatch) === teamName) pts += SWEEP.winTournament;

  const mult = role === "darkhorse" ? DARK_HORSE_MULTIPLIER : 1;
  return pts * mult;
}

// Total tipping points for a user across all finished matches.
export function tipTotal(userName, tips, matches) {
  const byId = {};
  for (const m of matches) byId[m.id] = m;
  let pts = 0;
  for (const t of tips) {
    if (t.user_name !== userName) continue;
    const m = byId[t.match_id];
    if (!m || m.status !== "final") continue;
    pts += tipPoints(m.stage, t.pick, resultForTip(m));
  }
  return pts;
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npx vitest run src/worldcup/scoring.test.js`
Expected: PASS — every describe block green.

- [ ] **Step 5: Commit**

```bash
git add src/worldcup/scoring.js src/worldcup/scoring.test.js
git commit -m "feat(worldcup): add sweepstakes + tip totals with tests"
```

---

## Task 6: Dark-horse draw (TDD)

**Files:**
- Create: `src/worldcup/draw.js`
- Test: `src/worldcup/draw.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/worldcup/draw.test.js
import { describe, it, expect } from "vitest";
import { darkHorsePool, drawDarkHorses } from "./draw.js";

const teams = [
  { name: "England", is_favourite: true },
  { name: "Australia", is_favourite: false },
  { name: "Spain", is_favourite: true },
  { name: "Ghana", is_favourite: false },
  { name: "Japan", is_favourite: false },
  { name: "Norway", is_favourite: false },
  { name: "Ecuador", is_favourite: false },
  { name: "Morocco", is_favourite: false },
];

describe("darkHorsePool", () => {
  it("excludes favourites and the two main teams", () => {
    const pool = darkHorsePool(teams);
    expect(pool).not.toContain("England");   // main + favourite
    expect(pool).not.toContain("Australia"); // main team
    expect(pool).not.toContain("Spain");     // favourite
    expect(pool).toContain("Ghana");
    expect(pool).toContain("Morocco");
  });
});

describe("drawDarkHorses", () => {
  it("gives each owner two non-overlapping teams from the pool", () => {
    // Deterministic rng: always 0 -> stable shuffle.
    const result = drawDarkHorses(teams, 2, () => 0);
    expect(result.Ozzy).toHaveLength(2);
    expect(result.Tommy).toHaveLength(2);
    const all = [...result.Ozzy, ...result.Tommy];
    expect(new Set(all).size).toBe(4); // no overlaps
    const pool = darkHorsePool(teams);
    all.forEach((name) => expect(pool).toContain(name));
  });
  it("throws when the pool is too small", () => {
    const tiny = [{ name: "Ghana", is_favourite: false }];
    expect(() => drawDarkHorses(tiny, 2)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/worldcup/draw.test.js`
Expected: FAIL — `draw.js` missing.

- [ ] **Step 3: Implement the draw**

```js
// src/worldcup/draw.js
import { FAVOURITES, MAIN_TEAMS, OWNERS } from "./constants.js";

// Names eligible to be drawn as dark horses.
export function darkHorsePool(teams) {
  const mains = Object.values(MAIN_TEAMS);
  return teams
    .filter((t) => !t.is_favourite)
    .map((t) => t.name)
    .filter((name) => !FAVOURITES.includes(name) && !mains.includes(name));
}

// Draw `count` dark horses per owner, no overlaps.
// rng: () => number in [0,1), injectable for deterministic tests.
export function drawDarkHorses(teams, count = 2, rng = Math.random) {
  const pool = [...darkHorsePool(teams)];
  const needed = OWNERS.length * count;
  if (pool.length < needed) {
    throw new Error(`Dark-horse pool too small: need ${needed}, have ${pool.length}`);
  }
  // Fisher–Yates shuffle.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const result = {};
  let idx = 0;
  for (const owner of OWNERS) {
    result[owner] = pool.slice(idx, idx + count);
    idx += count;
  }
  return result;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run`
Expected: PASS — all scoring and draw tests green.

- [ ] **Step 5: Commit**

```bash
git add src/worldcup/draw.js src/worldcup/draw.test.js
git commit -m "feat(worldcup): add dark-horse draw with tests"
```

---

## Task 7: Data helpers

**Files:**
- Create: `src/worldcup/db.js`

- [ ] **Step 1: Write the data helpers**

```js
// src/worldcup/db.js
import { supabase } from "../supabase";

export async function fetchAll() {
  const [{ data: teams }, { data: matches }, { data: tips }] = await Promise.all([
    supabase.from("wc_teams").select("*").order("name"),
    supabase.from("wc_matches").select("*").order("kickoff", { nullsFirst: false }),
    supabase.from("wc_tips").select("*"),
  ]);
  return { teams: teams || [], matches: matches || [], tips: tips || [] };
}

export async function upsertTip(matchId, userName, pick) {
  return supabase
    .from("wc_tips")
    .upsert({ match_id: matchId, user_name: userName, pick }, { onConflict: "match_id,user_name" });
}

export async function saveResult(matchId, fields) {
  // fields: { home_score, away_score, winner_team?, status: "final" }
  return supabase.from("wc_matches").update(fields).eq("id", matchId);
}

export async function addTeam(team) {
  return supabase.from("wc_teams").insert(team);
}

export async function addMatch(match) {
  return supabase.from("wc_matches").insert(match);
}

export async function setTeamOwner(id, owner, role) {
  return supabase.from("wc_teams").update({ owner, role }).eq("id", id);
}

export async function clearOwners() {
  return supabase.from("wc_teams").update({ owner: null, role: null }).not("id", "is", null);
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds (the module is imported nowhere yet, but must parse).

- [ ] **Step 3: Commit**

```bash
git add src/worldcup/db.js
git commit -m "feat(worldcup): add supabase data helpers"
```

---

## Task 8: Page shell + routing + nav

**Files:**
- Create: `src/components/WorldCup.jsx`
- Create: `src/components/WorldCup.css`
- Modify: `src/App.jsx`
- Modify: `src/components/NavBar.jsx`

- [ ] **Step 1: Create the page shell**

```jsx
// src/components/WorldCup.jsx
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabase";
import { fetchAll } from "../worldcup/db";
import WorldCupTip from "./WorldCupTip";
import WorldCupLeaderboard from "./WorldCupLeaderboard";
import WorldCupTeams from "./WorldCupTeams";
import WorldCupSetup from "./WorldCupSetup";
import "./WorldCup.css";

const TABS = [
  { key: "tip", label: "Tip" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "teams", label: "My Teams" },
];

export default function WorldCup() {
  const [tab, setTab] = useState("tip");
  const [data, setData] = useState({ teams: [], matches: [], tips: [] });
  const [showSetup, setShowSetup] = useState(false);

  const load = useCallback(async () => {
    setData(await fetchAll());
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("worldcup")
      .on("postgres_changes", { event: "*", schema: "public", table: "wc_teams" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "wc_matches" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "wc_tips" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="wc-container">
        <div className="wc-header">
          <h1 className="wc-title">🏆 World Cup</h1>
          <button className="wc-setup-btn" onClick={() => setShowSetup(true)} aria-label="Setup">⚙️</button>
        </div>

        <div className="wc-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={"wc-tab" + (tab === t.key ? " active" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "tip" && <WorldCupTip data={data} />}
        {tab === "leaderboard" && <WorldCupLeaderboard data={data} />}
        {tab === "teams" && <WorldCupTeams data={data} />}

        {showSetup && <WorldCupSetup data={data} onClose={() => setShowSetup(false)} />}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create a minimal stylesheet (polished later in Task 12)**

```css
/* src/components/WorldCup.css */
.wc-container { max-width: 640px; margin: 0 auto; padding: 1rem; }
.wc-header { display: flex; align-items: center; justify-content: space-between; }
.wc-title { color: var(--accent, var(--green-dark)); margin: 0; }
.wc-setup-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; }

.wc-tabs { display: flex; gap: .5rem; margin: 1rem 0; }
.wc-tab {
  flex: 1; padding: .6rem; border: 2px solid var(--border); border-radius: 12px;
  background: var(--white); color: var(--text, var(--brown)); font-weight: 700; cursor: pointer;
}
.wc-tab.active { background: var(--accent, var(--green-dark)); color: var(--white); border-color: var(--accent, var(--green-dark)); }

.wc-card { background: rgba(255,255,255,.9); border: 2px solid var(--border); border-radius: 14px; padding: 1rem; margin-bottom: .75rem; }
.wc-empty { text-align: center; color: var(--text-light, var(--brown)); padding: 2rem 1rem; }
```

- [ ] **Step 3: Create the three tab components as stubs so the shell compiles**

Create `src/components/WorldCupTip.jsx`, `WorldCupLeaderboard.jsx`, `WorldCupTeams.jsx`, and `WorldCupSetup.jsx`, each a minimal placeholder for now:

```jsx
// src/components/WorldCupTip.jsx
export default function WorldCupTip() {
  return <div className="wc-empty">Tip tab — coming up in Task 9.</div>;
}
```

```jsx
// src/components/WorldCupLeaderboard.jsx
export default function WorldCupLeaderboard() {
  return <div className="wc-empty">Leaderboard — coming up in Task 10.</div>;
}
```

```jsx
// src/components/WorldCupTeams.jsx
export default function WorldCupTeams() {
  return <div className="wc-empty">My Teams — coming up in Task 11.</div>;
}
```

```jsx
// src/components/WorldCupSetup.jsx
export default function WorldCupSetup({ onClose }) {
  return (
    <div className="wc-empty">
      Setup — coming up in Task 9b. <button onClick={onClose}>Close</button>
    </div>
  );
}
```

- [ ] **Step 4: Register the lazy route in `src/App.jsx`**

Add to the lazy imports block (after the `BigIdeas` line):

```jsx
const WorldCup = lazy(() => import("./components/WorldCup"));
```

Add inside `<Routes>` (after the `/ideas` route):

```jsx
<Route path="/worldcup" element={<WorldCup />} />
```

- [ ] **Step 5: Add the sidebar link in `src/components/NavBar.jsx`**

Add after the Big Ideas `<NavLink>` block:

```jsx
<NavLink to="/worldcup" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
  🏆 World Cup
</NavLink>
```

- [ ] **Step 6: Verify lint + build + route renders**

Run: `npm run lint` — expected: 0 errors.
Run: `npm run build` — expected: success.
Run: `npm run dev`, open `http://localhost:5173/worldcup` — expected: title, three tabs switch, ⚙️ opens the stub setup.

- [ ] **Step 7: Commit**

```bash
git add src/components/WorldCup.jsx src/components/WorldCup.css src/components/WorldCupTip.jsx src/components/WorldCupLeaderboard.jsx src/components/WorldCupTeams.jsx src/components/WorldCupSetup.jsx src/App.jsx src/components/NavBar.jsx
git commit -m "feat(worldcup): add page shell, route and nav link"
```

---

## Task 9: Setup panel (manual data entry + draw)

**Files:**
- Modify: `src/components/WorldCupSetup.jsx`
- Modify: `src/components/WorldCup.css`

- [ ] **Step 1: Implement the Setup modal**

```jsx
// src/components/WorldCupSetup.jsx
import { useState } from "react";
import { STAGES, STAGE_LABELS, MAIN_TEAMS, OWNERS } from "../worldcup/constants";
import { addTeam, addMatch, setTeamOwner, clearOwners } from "../worldcup/db";
import { drawDarkHorses } from "../worldcup/draw";

export default function WorldCupSetup({ data, onClose }) {
  const { teams } = data;
  const [teamName, setTeamName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [match, setMatch] = useState({ stage: "group", home_team: "", away_team: "" });
  const [busy, setBusy] = useState(false);

  async function handleAddTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setBusy(true);
    await addTeam({ name: teamName.trim(), group_code: groupCode.trim() || null, is_favourite: isFav });
    setTeamName(""); setGroupCode(""); setIsFav(false);
    setBusy(false);
  }

  async function handleAddMatch(e) {
    e.preventDefault();
    if (!match.home_team || !match.away_team) return;
    setBusy(true);
    await addMatch({ ...match, status: "scheduled" });
    setMatch({ stage: match.stage, home_team: "", away_team: "" });
    setBusy(false);
  }

  async function assignMains() {
    setBusy(true);
    for (const owner of OWNERS) {
      const t = teams.find((x) => x.name === MAIN_TEAMS[owner]);
      if (t) await setTeamOwner(t.id, owner, "main");
    }
    setBusy(false);
  }

  async function runDraw() {
    setBusy(true);
    try {
      const drawn = drawDarkHorses(teams);
      // clear existing dark horses first, keep mains
      for (const t of teams.filter((x) => x.role === "darkhorse")) {
        await setTeamOwner(t.id, null, null);
      }
      for (const owner of OWNERS) {
        for (const name of drawn[owner]) {
          const t = teams.find((x) => x.name === name);
          if (t) await setTeamOwner(t.id, owner, "darkhorse");
        }
      }
    } catch (err) {
      alert(err.message);
    }
    setBusy(false);
  }

  const teamNames = teams.map((t) => t.name);

  return (
    <div className="wc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wc-modal">
        <div className="wc-modal-head">
          <h2>Setup</h2>
          <button className="wc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <section className="wc-setup-section">
          <h3>Add a team</h3>
          <form onSubmit={handleAddTeam} className="wc-form-row">
            <input placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <input placeholder="Group" maxLength={2} value={groupCode} onChange={(e) => setGroupCode(e.target.value)} />
            <label className="wc-check"><input type="checkbox" checked={isFav} onChange={(e) => setIsFav(e.target.checked)} /> Favourite</label>
            <button disabled={busy}>Add</button>
          </form>
          <p className="wc-muted">{teams.length} teams added</p>
        </section>

        <section className="wc-setup-section">
          <h3>Add a match</h3>
          <form onSubmit={handleAddMatch} className="wc-form-row">
            <select value={match.stage} onChange={(e) => setMatch((m) => ({ ...m, stage: e.target.value }))}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <select value={match.home_team} onChange={(e) => setMatch((m) => ({ ...m, home_team: e.target.value }))}>
              <option value="">Home…</option>
              {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={match.away_team} onChange={(e) => setMatch((m) => ({ ...m, away_team: e.target.value }))}>
              <option value="">Away…</option>
              {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button disabled={busy || !match.home_team || !match.away_team}>Add</button>
          </form>
        </section>

        <section className="wc-setup-section">
          <h3>Sweepstakes draw</h3>
          <p className="wc-muted">Mains: Ozzy → {MAIN_TEAMS.Ozzy}, Tommy → {MAIN_TEAMS.Tommy}</p>
          <div className="wc-form-row">
            <button disabled={busy} onClick={assignMains}>Assign main teams</button>
            <button disabled={busy} onClick={runDraw}>🎲 Draw dark horses</button>
            <button disabled={busy} onClick={() => clearOwners()}>Clear all</button>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add modal styles**

Append to `src/components/WorldCup.css`:

```css
.wc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; z-index: 50; overflow-y: auto; }
.wc-modal { background: var(--white); border-radius: 16px; padding: 1.25rem; width: 100%; max-width: 520px; }
.wc-modal-head { display: flex; justify-content: space-between; align-items: center; }
.wc-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
.wc-setup-section { margin-top: 1rem; border-top: 1px solid var(--border); padding-top: .75rem; }
.wc-form-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.wc-form-row input, .wc-form-row select { padding: .5rem; border: 1px solid var(--border); border-radius: 8px; }
.wc-form-row button { padding: .5rem .8rem; border: none; border-radius: 8px; background: var(--accent, var(--green-dark)); color: var(--white); font-weight: 700; cursor: pointer; }
.wc-check { display: flex; align-items: center; gap: .3rem; font-size: .9rem; }
.wc-muted { color: var(--text-light, var(--brown)); font-size: .85rem; margin: .4rem 0 0; }
```

- [ ] **Step 3: Verify**

Run: `npm run lint` && `npm run build` — expected: clean.
Manual: open ⚙️, add two teams, add a match, click "Assign main teams". Confirm via Supabase MCP `execute_sql` (`select name, owner, role from wc_teams where owner is not null`).

- [ ] **Step 4: Commit**

```bash
git add src/components/WorldCupSetup.jsx src/components/WorldCup.css
git commit -m "feat(worldcup): add setup panel for teams, matches and draw"
```

---

## Task 10: Tip tab (pick + enter result)

**Files:**
- Modify: `src/components/WorldCupTip.jsx`
- Modify: `src/components/WorldCup.css`

- [ ] **Step 1: Implement the Tip tab**

```jsx
// src/components/WorldCupTip.jsx
import { useState } from "react";
import { OWNERS, STAGE_LABELS } from "../worldcup/constants";
import { upsertTip, saveResult } from "../worldcup/db";
import { resultForTip, matchWinner } from "../worldcup/scoring";

function pickOptions(stage) {
  // Knockouts can't end in a draw for tipping purposes.
  return stage === "group"
    ? [["home", "Home"], ["draw", "Draw"], ["away", "Away"]]
    : [["home", "Home"], ["away", "Away"]];
}

export default function WorldCupTip({ data }) {
  const { matches, tips } = data;
  const [resultFor, setResultFor] = useState(null); // match id being scored
  const [scores, setScores] = useState({ home: "", away: "", winner: "" });

  const tipFor = (matchId, user) =>
    tips.find((t) => t.match_id === matchId && t.user_name === user)?.pick;

  async function pick(match, user, value) {
    await upsertTip(match.id, user, value);
  }

  async function submitResult(match) {
    const home = parseInt(scores.home, 10);
    const away = parseInt(scores.away, 10);
    if (Number.isNaN(home) || Number.isNaN(away)) return;
    const fields = { home_score: home, away_score: away, status: "final" };
    if (match.stage !== "group" && home === away) {
      if (!scores.winner) { alert("Pick who advanced (penalties)."); return; }
      fields.winner_team = scores.winner;
    }
    await saveResult(match.id, fields);
    setResultFor(null);
    setScores({ home: "", away: "", winner: "" });
  }

  if (matches.length === 0) {
    return <div className="wc-empty">No matches yet — add fixtures with the ⚙️ Setup button.</div>;
  }

  return (
    <div className="wc-tip-list">
      {matches.map((m) => {
        const isFinal = m.status === "final";
        const graded = isFinal ? resultForTip(m) : null;
        return (
          <div key={m.id} className="wc-card wc-match">
            <div className="wc-match-top">
              <span className="wc-stage">{STAGE_LABELS[m.stage]}</span>
              {isFinal && (
                <span className="wc-score">
                  {m.home_score}–{m.away_score}
                  {m.winner_team ? ` (${m.winner_team})` : ""}
                </span>
              )}
            </div>
            <div className="wc-teams-row">
              <span>{m.home_team}</span>
              <span className="wc-vs">v</span>
              <span>{m.away_team}</span>
            </div>

            {OWNERS.map((user) => {
              const myPick = tipFor(m.id, user);
              const correct = isFinal && myPick && myPick === graded;
              return (
                <div key={user} className="wc-pick-row">
                  <span className="wc-pick-user">{user}</span>
                  <div className="wc-pick-btns">
                    {pickOptions(m.stage).map(([val, label]) => (
                      <button
                        key={val}
                        disabled={isFinal}
                        className={"wc-pick" + (myPick === val ? " chosen" : "")}
                        onClick={() => pick(m, user, val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {isFinal && myPick && (
                    <span className={"wc-tick" + (correct ? " ok" : " no")}>{correct ? "✓" : "✗"}</span>
                  )}
                </div>
              );
            })}

            {!isFinal && (
              resultFor === m.id ? (
                <div className="wc-result-entry">
                  <input type="number" min="0" placeholder="H" value={scores.home}
                    onChange={(e) => setScores((s) => ({ ...s, home: e.target.value }))} />
                  <input type="number" min="0" placeholder="A" value={scores.away}
                    onChange={(e) => setScores((s) => ({ ...s, away: e.target.value }))} />
                  {m.stage !== "group" && scores.home !== "" && scores.home === scores.away && (
                    <select value={scores.winner} onChange={(e) => setScores((s) => ({ ...s, winner: e.target.value }))}>
                      <option value="">Won on pens…</option>
                      <option value={m.home_team}>{m.home_team}</option>
                      <option value={m.away_team}>{m.away_team}</option>
                    </select>
                  )}
                  <button onClick={() => submitResult(m)}>Save</button>
                  <button onClick={() => setResultFor(null)}>✕</button>
                </div>
              ) : (
                <button className="wc-enter-result" onClick={() => { setResultFor(m.id); setScores({ home: "", away: "", winner: "" }); }}>
                  Enter result
                </button>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add Tip styles**

Append to `src/components/WorldCup.css`:

```css
.wc-match-top { display: flex; justify-content: space-between; font-size: .8rem; color: var(--text-light, var(--brown)); }
.wc-score { font-weight: 800; color: var(--text, var(--brown)); }
.wc-teams-row { display: flex; justify-content: center; gap: .6rem; font-weight: 800; margin: .4rem 0; }
.wc-vs { color: var(--text-light, var(--brown)); font-weight: 600; }
.wc-pick-row { display: flex; align-items: center; gap: .5rem; margin-top: .4rem; }
.wc-pick-user { width: 3.5rem; font-weight: 700; }
.wc-pick-btns { display: flex; gap: .3rem; flex: 1; }
.wc-pick { flex: 1; padding: .35rem; border: 1px solid var(--border); border-radius: 8px; background: var(--white); cursor: pointer; }
.wc-pick.chosen { background: var(--accent, var(--green-dark)); color: var(--white); border-color: var(--accent, var(--green-dark)); }
.wc-pick:disabled { opacity: .6; cursor: default; }
.wc-tick.ok { color: var(--green-dark); font-weight: 800; }
.wc-tick.no { color: #b23; }
.wc-enter-result { margin-top: .5rem; background: none; border: 1px dashed var(--border); border-radius: 8px; padding: .4rem; width: 100%; cursor: pointer; }
.wc-result-entry { display: flex; gap: .4rem; margin-top: .5rem; align-items: center; }
.wc-result-entry input { width: 3rem; padding: .4rem; border: 1px solid var(--border); border-radius: 8px; }
.wc-result-entry button { padding: .4rem .6rem; border: none; border-radius: 8px; background: var(--accent, var(--green-dark)); color: var(--white); cursor: pointer; }
```

- [ ] **Step 3: Verify**

Run: `npm run lint` && `npm run build` — expected: clean.
Manual: add a fixture in Setup, make a pick for each user, enter a result, confirm the pick locks and a ✓/✗ appears. For a knockout level score, confirm the "Won on pens" selector appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/WorldCupTip.jsx src/components/WorldCup.css
git commit -m "feat(worldcup): add tip tab with pick and result entry"
```

---

## Task 11: Leaderboard tab

**Files:**
- Modify: `src/components/WorldCupLeaderboard.jsx`
- Modify: `src/components/WorldCup.css`

- [ ] **Step 1: Implement the Leaderboard**

```jsx
// src/components/WorldCupLeaderboard.jsx
import { OWNERS } from "../worldcup/constants";
import { tipTotal, sweepstakesPoints } from "../worldcup/scoring";

export default function WorldCupLeaderboard({ data }) {
  const { teams, matches, tips } = data;

  const rows = OWNERS.map((user) => {
    const tipPts = tipTotal(user, tips, matches);
    const owned = teams.filter((t) => t.owner === user);
    const sweepPts = owned.reduce(
      (sum, t) => sum + sweepstakesPoints(t.name, t.role, matches),
      0
    );
    return { user, tipPts, sweepPts, total: tipPts + sweepPts };
  }).sort((a, b) => b.total - a.total);

  const leader = rows[0];
  const tied = rows.length > 1 && rows[0].total === rows[1].total;

  return (
    <div>
      <div className="wc-leader-banner">
        {leader.total === 0
          ? "No points yet — get tipping!"
          : tied
          ? `It's a tie on ${leader.total}!`
          : `${leader.user} leads with ${leader.total} 🏆`}
      </div>
      {rows.map((r) => (
        <div key={r.user} className="wc-card wc-leader-row">
          <span className="wc-leader-name">{r.user}</span>
          <span className="wc-leader-total">{r.total}</span>
          <span className="wc-leader-breakdown">
            tips {r.tipPts} · teams {r.sweepPts}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add Leaderboard styles**

Append to `src/components/WorldCup.css`:

```css
.wc-leader-banner { text-align: center; font-weight: 800; color: var(--accent, var(--green-dark)); margin-bottom: .75rem; }
.wc-leader-row { display: grid; grid-template-columns: 1fr auto; align-items: center; row-gap: .2rem; }
.wc-leader-name { font-weight: 800; font-size: 1.1rem; }
.wc-leader-total { font-weight: 800; font-size: 1.4rem; color: var(--accent, var(--green-dark)); }
.wc-leader-breakdown { grid-column: 1 / -1; font-size: .8rem; color: var(--text-light, var(--brown)); }
```

- [ ] **Step 3: Verify**

Run: `npm run lint` && `npm run build` — expected: clean.
Manual: with a finished match and tips entered, confirm totals and the leader banner match hand-calculation against the spec point table.

- [ ] **Step 4: Commit**

```bash
git add src/components/WorldCupLeaderboard.jsx src/components/WorldCup.css
git commit -m "feat(worldcup): add leaderboard tab"
```

---

## Task 12: My Teams tab

**Files:**
- Modify: `src/components/WorldCupTeams.jsx`
- Modify: `src/components/WorldCup.css`

- [ ] **Step 1: Implement My Teams**

```jsx
// src/components/WorldCupTeams.jsx
import { OWNERS } from "../worldcup/constants";
import { sweepstakesPoints, reachedKnockouts, matchWinner } from "../worldcup/scoring";

function teamStatus(name, matches) {
  if (reachedKnockouts(name, matches)) {
    // eliminated if it lost a finished knockout match
    const lost = matches.some(
      (m) => m.stage !== "group" && m.status === "final" &&
        (m.home_team === name || m.away_team === name) && matchWinner(m) !== name
    );
    return lost ? "Knocked out" : "Still in 🟢";
  }
  return "Group stage";
}

export default function WorldCupTeams({ data }) {
  const { teams, matches } = data;

  return (
    <div>
      {OWNERS.map((user) => {
        const owned = teams.filter((t) => t.owner === user);
        const total = owned.reduce((s, t) => s + sweepstakesPoints(t.name, t.role, matches), 0);
        return (
          <div key={user} className="wc-card">
            <div className="wc-team-head">
              <span className="wc-leader-name">{user}</span>
              <span className="wc-leader-total">{total}</span>
            </div>
            {owned.length === 0 && <p className="wc-muted">No teams yet — run the draw in ⚙️ Setup.</p>}
            {owned.map((t) => (
              <div key={t.id} className="wc-team-row">
                <span className="wc-team-name">{t.name}</span>
                <span className={"wc-role wc-role-" + t.role}>{t.role === "darkhorse" ? "🐎 dark horse ×2" : "⭐ main"}</span>
                <span className="wc-team-pts">{sweepstakesPoints(t.name, t.role, matches)} pts</span>
                <span className="wc-team-status">{teamStatus(t.name, matches)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add My Teams styles**

Append to `src/components/WorldCup.css`:

```css
.wc-team-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.wc-team-row { display: grid; grid-template-columns: 1fr auto; gap: .2rem .5rem; padding: .4rem 0; border-top: 1px solid var(--border); }
.wc-team-name { font-weight: 700; }
.wc-role { font-size: .8rem; }
.wc-role-darkhorse { color: var(--purple); font-weight: 700; }
.wc-team-pts { font-weight: 800; }
.wc-team-status { grid-column: 1 / -1; font-size: .8rem; color: var(--text-light, var(--brown)); }
```

- [ ] **Step 3: Verify**

Run: `npm run lint` && `npm run build` — expected: clean.
Manual: after a draw + some results, confirm each user shows main + 2 dark horses, dark-horse points are doubled, and status updates after a knockout loss.

- [ ] **Step 4: Commit**

```bash
git add src/components/WorldCupTeams.jsx src/components/WorldCup.css
git commit -m "feat(worldcup): add my teams tab"
```

---

## Task 13: Visual polish

**Files:**
- Modify: `src/components/WorldCup.css` (and small JSX tweaks as needed)

- [ ] **Step 1: Apply the frontend-design skill**

Invoke `frontend-design` and bring the World Cup page up to the family-hub look: consistent card styling, the app's colour tokens (`--accent`, `--text`, `--purple`), Nunito type scale, comfortable tap targets for mobile (Ozzy & Tommy use Safari on iOS), and a clear active-tab treatment. Include an image "slot" (a `.wc-hero` banner block with a background-image hook) so externally generated artwork can be dropped into `src/assets/` and referenced later.

- [ ] **Step 2: Apply impeccable polish passes**

Invoke `impeccable:polish` then `impeccable:delight` for micro-interactions (tab transitions, pick-button press feedback, a subtle celebrate on a correct tip). Respect the existing `prefers-reduced-motion` support already in the app.

- [ ] **Step 3: Verify**

Run: `npm run lint` && `npm run build` — expected: clean.
Manual: walk all three tabs + setup on a narrow (mobile-width) viewport via the dev server; confirm nothing overflows and tap targets are comfortable.

- [ ] **Step 4: Commit**

```bash
git add src/components/WorldCup.css src/components/WorldCup*.jsx
git commit -m "style(worldcup): polish layout, theme and micro-interactions"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full test + lint + build**

Run: `npx vitest run` — expected: all logic tests pass.
Run: `npm run lint` — expected: 0 errors.
Run: `npm run build` — expected: success.

- [ ] **Step 2: End-to-end manual smoke test**

On the dev server: add a few teams (incl. favourites), add group fixtures, assign mains, run the draw, make tips as both users, enter results (incl. a level knockout), and confirm the leaderboard + My Teams update in real time. If a second browser/device is handy, confirm realtime sync.

- [ ] **Step 3: Offer to merge**

Summarise to the user and offer to merge `feature/worldcup` → `main` (which triggers the Vercel deploy). Do not merge without the user's go-ahead.

---

## Self-Review Notes

- **Spec coverage:** tipping (Tasks 4, 10), escalating knockout points (constants Task 3, scoring Task 4), sweepstakes 3-teams + double dark-horse (Tasks 5, 9, 12), curated dark-horse draw (Task 6, 9), manual entry (Task 9, 10), realtime + leaderboard (Tasks 8, 11), 3 tabs + nav (Task 8), image slot for external art (Task 13), data model (Task 1). All covered.
- **Knockout draws:** handled via `winner_team` column + UI selector (penalties), consistent across schema (Task 1), scoring (`matchWinner`, Task 4), and result entry (Task 10).
- **Type consistency:** `resultForTip`/`matchWinner`/`sweepstakesPoints`/`tipTotal`/`drawDarkHorses` signatures are identical between their defining tasks and their call sites in the components.
- **No external API, no exact-score, two users only** — respected throughout (YAGNI per spec).
