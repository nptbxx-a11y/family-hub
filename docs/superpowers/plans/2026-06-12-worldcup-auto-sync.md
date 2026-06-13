# World Cup Auto-Sync + Revised Tipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-source 2026 World Cup teams/fixtures/results from the keyless openfootball JSON (no manual entry), and revise tipping so groups are simple Home/Draw/Away and knockouts are exact-score predictions.

**Architecture:** A client-side sync (pure mappers in `feed.js` + thin orchestration in `sync.js`) pulls the public JSON and upserts into the existing Supabase tables on page load and via a Refresh button. The scoring engine's group/knockout tip grading is revised. No serverless function, cron, or API key.

**Tech Stack:** React 19 + Vite, Supabase JS, Vitest (pure logic only).

**Spec:** `docs/superpowers/specs/2026-06-12-worldcup-auto-sync-design.md`

**Existing code to build on:** `src/worldcup/{constants,scoring,draw,db}.js` (+ tests) and `src/components/WorldCup*.jsx` are already shipped. This plan modifies them.

---

## File Structure

**New:**
- `src/worldcup/feed.js` — pure feed→row mappers (placeholder detection, round→stage, kickoff parse, match map, team extract).
- `src/worldcup/feed.test.js` — Vitest tests for the mappers.
- `src/worldcup/sync.js` — thin orchestration: fetch JSON → map → upsert via supabase.

**Modified:**
- `src/worldcup/constants.js` — revised point constants + feed URL.
- `src/worldcup/scoring.js` + `scoring.test.js` — group vs knockout tip grading.
- `src/worldcup/db.js` — `upsertTip` takes a fields object; drop dead helpers.
- `src/components/WorldCupTip.jsx` — group buttons vs knockout score inputs; lock at kickoff; hide placeholder fixtures; no manual result entry.
- `src/components/WorldCupSetup.jsx` — drop add-team/add-match forms; add Sync button; keep draw.
- `src/components/WorldCup.jsx` — run sync on mount; pass a refresh handler.
- `src/components/WorldCup.css` — minor styles for knockout score inputs / refresh button.

**Schema:** `wc_matches.ext_key`; `wc_tips.pred_home`, `wc_tips.pred_away`, `pick` nullable.

---

## Task 1: Schema migration

**Files:** Supabase only (apply via Supabase MCP `apply_migration`, project `bedprxjeqtkqyiefdsbs`).

- [ ] **Step 1: Apply the migration** (name `worldcup_autosync`)

```sql
alter table wc_matches add column if not exists ext_key text;
create unique index if not exists wc_matches_ext_key_key on wc_matches (ext_key);

alter table wc_tips add column if not exists pred_home int;
alter table wc_tips add column if not exists pred_away int;
alter table wc_tips alter column pick drop not null;
```

- [ ] **Step 2: Verify**

Use Supabase MCP `list_tables` (verbose) and confirm `wc_matches.ext_key` exists with a unique index, and `wc_tips` has `pred_home`, `pred_away`, and `pick` is nullable.

- [ ] **Step 3: No repo commit** — note completion.

---

## Task 2: Feed mapping module (TDD)

**Files:**
- Create: `src/worldcup/feed.js`
- Test: `src/worldcup/feed.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/worldcup/feed.test.js
import { describe, it, expect } from "vitest";
import {
  isPlaceholderTeam,
  roundToStage,
  parseKickoff,
  mapFeedMatch,
  extractTeams,
} from "./feed.js";

describe("isPlaceholderTeam", () => {
  it("flags group/winner placeholders", () => {
    expect(isPlaceholderTeam("1A")).toBe(true);
    expect(isPlaceholderTeam("2B")).toBe(true);
    expect(isPlaceholderTeam("W74")).toBe(true);
    expect(isPlaceholderTeam("L73")).toBe(true);
    expect(isPlaceholderTeam(undefined)).toBe(true);
  });
  it("accepts real country names", () => {
    expect(isPlaceholderTeam("England")).toBe(false);
    expect(isPlaceholderTeam("South Africa")).toBe(false);
  });
});

describe("roundToStage", () => {
  it("maps group games", () => {
    expect(roundToStage("Matchday 1", "Group A")).toBe("group");
    expect(roundToStage("Matchday 3", "Group L")).toBe("group");
  });
  it("maps knockout rounds", () => {
    expect(roundToStage("Round of 32")).toBe("r32");
    expect(roundToStage("Round of 16")).toBe("r16");
    expect(roundToStage("Quarter-finals")).toBe("qf");
    expect(roundToStage("Semi-finals")).toBe("sf");
    expect(roundToStage("Final")).toBe("final");
  });
  it("skips the third-place play-off", () => {
    expect(roundToStage("Match for third place")).toBe(null);
  });
});

describe("parseKickoff", () => {
  it("converts local-with-offset to a UTC ISO string", () => {
    // 13:00 at UTC-6 == 19:00 UTC
    expect(parseKickoff("2026-06-11", "13:00 UTC-6")).toBe("2026-06-11T19:00:00.000Z");
  });
  it("returns null when time is missing", () => {
    expect(parseKickoff("2026-06-11", undefined)).toBe(null);
  });
});

describe("mapFeedMatch", () => {
  it("maps a finished group match", () => {
    const row = mapFeedMatch({
      round: "Matchday 1", date: "2026-06-11", time: "13:00 UTC-6",
      team1: "Mexico", team2: "South Africa", group: "Group A",
      score: { ft: [2, 0], ht: [1, 0] },
    });
    expect(row).toMatchObject({
      ext_key: "2026-06-11|Mexico|South Africa",
      stage: "group", group_code: "A",
      home_team: "Mexico", away_team: "South Africa",
      home_score: 2, away_score: 0, status: "final",
    });
  });
  it("maps an unplayed knockout with num as ext_key and scheduled status", () => {
    const row = mapFeedMatch({
      round: "Round of 32", num: 73, date: "2026-06-28", time: "12:00 UTC-7",
      team1: "1A", team2: "3C",
    });
    expect(row).toMatchObject({ ext_key: "73", stage: "r32", status: "scheduled", home_score: null });
  });
  it("returns null for skipped rounds", () => {
    expect(mapFeedMatch({ round: "Match for third place", date: "x", team1: "A", team2: "B" })).toBe(null);
  });
  it("sets winner_team from a penalty score", () => {
    const row = mapFeedMatch({
      round: "Final", num: 104, date: "2026-07-19", time: "15:00 UTC-4",
      team1: "Brazil", team2: "France", score: { ft: [1, 1], p: [4, 2] },
    });
    expect(row.winner_team).toBe("Brazil");
  });
});

describe("extractTeams", () => {
  it("collects real teams, tags favourites, skips placeholders", () => {
    const teams = extractTeams([
      { team1: "England", team2: "Wales", group: "Group A" },
      { team1: "1A", team2: "2B" },
    ]);
    const byName = Object.fromEntries(teams.map((t) => [t.name, t]));
    expect(Object.keys(byName).sort()).toEqual(["England", "Wales"]);
    expect(byName.England.is_favourite).toBe(true);
    expect(byName.Wales.is_favourite).toBe(false);
    expect(byName.England.group_code).toBe("A");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/worldcup/feed.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/worldcup/feed.js`**

```js
// src/worldcup/feed.js
// Pure mappers from the openfootball worldcup.json shape to our DB row shapes.
import { FAVOURITES } from "./constants.js";

// A team string like "1A", "2B", "W74", "L73" is a not-yet-decided placeholder.
export function isPlaceholderTeam(name) {
  if (!name) return true;
  return /^\d[A-L]$/.test(name) || /^[WL]\d+$/.test(name) || /^RU?\d/.test(name);
}

// Map a feed round label (+ optional group) to our stage, or null to skip.
export function roundToStage(round, group) {
  if (group) return "group";
  const r = (round || "").toLowerCase();
  if (r.startsWith("matchday") || r.includes("group")) return "group";
  if (r.includes("third") || r.includes("3rd")) return null; // skip play-off
  if (r.includes("32")) return "r32";
  if (r.includes("16")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final";
  return null;
}

// "13:00 UTC-6" + "2026-06-11" -> "2026-06-11T19:00:00.000Z", or null.
export function parseKickoff(date, time) {
  if (!date || !time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::(\d{2}))?/i);
  if (!m) return null;
  const [, hh, mm, offH, offM] = m;
  const [y, mo, d] = date.split("-").map(Number);
  const offsetHours = parseInt(offH, 10);
  const offsetMins = (offsetHours < 0 ? -1 : 1) * parseInt(offM || "0", 10);
  // UTC = local - offset
  const utc = Date.UTC(y, mo - 1, d, parseInt(hh, 10) - offsetHours, parseInt(mm, 10) - offsetMins);
  return new Date(utc).toISOString();
}

function groupCode(group) {
  return group ? group.replace(/^Group\s*/i, "").trim() : null;
}

// Map one feed match to a wc_matches row, or null if the round is skipped.
export function mapFeedMatch(m) {
  const stage = roundToStage(m.round, m.group);
  if (!stage) return null;
  const ext_key = m.num != null ? String(m.num) : `${m.date}|${m.team1}|${m.team2}`;
  const ft = m.score && m.score.ft;
  const pens = m.score && m.score.p;
  return {
    ext_key,
    stage,
    group_code: groupCode(m.group),
    home_team: m.team1,
    away_team: m.team2,
    kickoff: parseKickoff(m.date, m.time),
    home_score: ft ? ft[0] : null,
    away_score: ft ? ft[1] : null,
    winner_team: ft && pens ? (pens[0] > pens[1] ? m.team1 : m.team2) : null,
    status: ft ? "final" : "scheduled",
  };
}

// Collect the unique real teams across all feed matches.
export function extractTeams(matches) {
  const map = new Map();
  for (const m of matches) {
    for (const name of [m.team1, m.team2]) {
      if (isPlaceholderTeam(name) || map.has(name)) continue;
      map.set(name, {
        name,
        group_code: groupCode(m.group),
        is_favourite: FAVOURITES.includes(name),
      });
    }
  }
  return [...map.values()];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/worldcup/feed.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/worldcup/feed.js src/worldcup/feed.test.js
git commit -m "feat(worldcup): add pure feed mappers with tests"
```

---

## Task 3: Revised tip scoring (TDD)

**Files:**
- Modify: `src/worldcup/constants.js`
- Modify: `src/worldcup/scoring.js`
- Modify: `src/worldcup/scoring.test.js`

- [ ] **Step 1: Update constants**

In `src/worldcup/constants.js`, **remove** the `TIP_POINTS` export and **add**:

```js
// Tip scoring: group = simple outcome; knockout = exact-score prediction (flat).
export const GROUP_TIP = 1;
export const KO_EXACT = 3;
export const KO_RESULT = 1;

// Public data feed (keyless).
export const FEED_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
```

Keep `OWNERS`, `MAIN_TEAMS`, `STAGES`, `STAGE_LABELS`, `SWEEP`, `DARK_HORSE_MULTIPLIER`, `FAVOURITES`.

- [ ] **Step 2: Replace the tip-scoring tests**

In `src/worldcup/scoring.test.js`, **delete** the old `describe("resultForTip", ...)`, `describe("tipPoints", ...)`, and `describe("tipTotal", ...)` blocks and the `tipPoints`/`resultForTip` names from the import. Update the import to include the new names and add new tests:

```js
import {
  outcomeFromScore,
  matchWinner,
  groupTipPoints,
  knockoutTipPoints,
  tipPointsForMatch,
  tipTotal,
  groupMatchBonus,
  reachedKnockouts,
  sweepstakesPoints,
} from "./scoring.js";

describe("groupTipPoints", () => {
  it("1 point for the correct result, else 0", () => {
    expect(groupTipPoints("home", 2, 0)).toBe(1);
    expect(groupTipPoints("draw", 1, 1)).toBe(1);
    expect(groupTipPoints("home", 0, 2)).toBe(0);
    expect(groupTipPoints(null, 1, 0)).toBe(0);
  });
});

describe("knockoutTipPoints", () => {
  it("3 for exact, 1 for right result, 0 otherwise", () => {
    expect(knockoutTipPoints(2, 1, 2, 1)).toBe(3);   // exact
    expect(knockoutTipPoints(2, 1, 3, 0)).toBe(1);   // both home wins
    expect(knockoutTipPoints(2, 1, 0, 1)).toBe(0);   // wrong result
  });
  it("grades a pens game on the level FT score", () => {
    // predicted 1-1, finished 1-1 (then pens) -> exact
    expect(knockoutTipPoints(1, 1, 1, 1)).toBe(3);
    // predicted a home win, FT was a 1-1 draw -> wrong result
    expect(knockoutTipPoints(2, 1, 1, 1)).toBe(0);
  });
  it("0 when a value is missing", () => {
    expect(knockoutTipPoints(null, null, 1, 0)).toBe(0);
  });
});

describe("tipPointsForMatch", () => {
  it("dispatches group vs knockout and ignores unfinished matches", () => {
    const grp = { stage: "group", status: "final", home_score: 2, away_score: 0 };
    expect(tipPointsForMatch(grp, { pick: "home" })).toBe(1);
    const ko = { stage: "qf", status: "final", home_score: 1, away_score: 1 };
    expect(tipPointsForMatch(ko, { pred_home: 1, pred_away: 1 })).toBe(3);
    const scheduled = { stage: "group", status: "scheduled" };
    expect(tipPointsForMatch(scheduled, { pick: "home" })).toBe(0);
  });
});

describe("tipTotal", () => {
  const matches = [
    { id: "1", stage: "group", status: "final", home_score: 2, away_score: 0 },
    { id: "2", stage: "final", status: "final", home_score: 1, away_score: 1 },
  ];
  const tips = [
    { match_id: "1", user_name: "Ozzy", pick: "home" },              // +1
    { match_id: "2", user_name: "Ozzy", pred_home: 1, pred_away: 1 }, // +3 exact
    { match_id: "1", user_name: "Tommy", pick: "draw" },             // +0
  ];
  it("sums group + knockout tips", () => {
    expect(tipTotal("Ozzy", tips, matches)).toBe(4);
    expect(tipTotal("Tommy", tips, matches)).toBe(0);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/worldcup/scoring.test.js`
Expected: FAIL — new functions undefined; `TIP_POINTS` import gone.

- [ ] **Step 4: Update `src/worldcup/scoring.js`**

Change the top import from `./constants.js` to:

```js
import { GROUP_TIP, KO_EXACT, KO_RESULT, SWEEP, DARK_HORSE_MULTIPLIER } from "./constants.js";
```

**Delete** the old `tipPoints` and `resultForTip` functions. Keep `outcomeFromScore`, `matchWinner`, `groupMatchBonus`, `reachedKnockouts`, `sweepstakesPoints`. **Add**:

```js
// Group tip: 1 point for the correct outcome.
export function groupTipPoints(pick, homeScore, awayScore) {
  const r = outcomeFromScore(homeScore, awayScore);
  if (!pick || !r) return 0;
  return pick === r ? GROUP_TIP : 0;
}

// Knockout tip: 3 for exact score, 1 for the right result (graded on the FT
// score — penalties are ignored), else 0.
export function knockoutTipPoints(predHome, predAway, homeScore, awayScore) {
  if (predHome == null || predAway == null || homeScore == null || awayScore == null) return 0;
  if (predHome === homeScore && predAway === awayScore) return KO_EXACT;
  const pr = outcomeFromScore(predHome, predAway);
  const ar = outcomeFromScore(homeScore, awayScore);
  return pr === ar ? KO_RESULT : 0;
}

// Points one tip earns for one match (0 unless the match is final).
export function tipPointsForMatch(match, tip) {
  if (!match || match.status !== "final" || !tip) return 0;
  if (match.stage === "group") {
    return groupTipPoints(tip.pick, match.home_score, match.away_score);
  }
  return knockoutTipPoints(tip.pred_home, tip.pred_away, match.home_score, match.away_score);
}

// Total tipping points for a user across all matches.
export function tipTotal(userName, tips, matches) {
  const byId = {};
  for (const m of matches) byId[m.id] = m;
  let pts = 0;
  for (const t of tips) {
    if (t.user_name !== userName) continue;
    pts += tipPointsForMatch(byId[t.match_id], t);
  }
  return pts;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run`
Expected: PASS (feed + scoring + draw all green).

- [ ] **Step 6: Commit**

```bash
git add src/worldcup/constants.js src/worldcup/scoring.js src/worldcup/scoring.test.js
git commit -m "feat(worldcup): revise tipping — simple groups, predict-score knockouts"
```

---

## Task 4: Sync module

**Files:**
- Create: `src/worldcup/sync.js`

- [ ] **Step 1: Implement the sync**

```js
// src/worldcup/sync.js
// Fetches the public feed and upserts teams + matches into Supabase.
// Thin orchestration over the pure mappers in feed.js.
import { supabase } from "../supabase";
import { FEED_URL, MAIN_TEAMS, OWNERS } from "./constants";
import { mapFeedMatch, extractTeams } from "./feed";

export async function syncWorldCup() {
  const res = await fetch(FEED_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  const json = await res.json();
  const feedMatches = json.matches || [];

  // Teams first (matches reference team names). Upserting only these columns
  // leaves owner/role untouched on existing rows.
  const teams = extractTeams(feedMatches);
  if (teams.length) {
    await supabase.from("wc_teams").upsert(teams, { onConflict: "name" });
  }

  // Auto-assign main teams if present and not already owned.
  const { data: teamRows } = await supabase
    .from("wc_teams")
    .select("id, name, owner, role");
  for (const owner of OWNERS) {
    const t = (teamRows || []).find((x) => x.name === MAIN_TEAMS[owner]);
    if (t && !t.owner) {
      await supabase.from("wc_teams").update({ owner, role: "main" }).eq("id", t.id);
    }
  }

  // Matches: map, drop skipped rounds, upsert by ext_key.
  const rows = feedMatches.map(mapFeedMatch).filter(Boolean);
  if (rows.length) {
    await supabase.from("wc_matches").upsert(rows, { onConflict: "ext_key" });
  }

  const finished = rows.filter((r) => r.status === "final").length;
  return { teams: teams.length, matches: rows.length, finished };
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/worldcup/sync.js
git commit -m "feat(worldcup): add client-side feed sync"
```

---

## Task 5: Data helpers update

**Files:**
- Modify: `src/worldcup/db.js`

- [ ] **Step 1: Change `upsertTip` and remove dead helpers**

Replace the `upsertTip` function and **delete** `saveResult`, `addTeam`, and `addMatch` (no longer used — fixtures/results come from the sync). Keep `fetchAll`, `setTeamOwner`, `clearOwners`.

```js
// fields: { pick } for a group tip, or { pred_home, pred_away } for a knockout tip
export async function upsertTip(matchId, userName, fields) {
  return supabase
    .from("wc_tips")
    .upsert(
      { match_id: matchId, user_name: userName, ...fields },
      { onConflict: "match_id,user_name" }
    );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success (will fail to build if a component still imports a removed helper — that's fixed in Tasks 6–7; if so, proceed to those before re-running).

- [ ] **Step 3: Commit**

```bash
git add src/worldcup/db.js
git commit -m "refactor(worldcup): upsertTip takes a fields object; drop manual-entry helpers"
```

---

## Task 6: Revised Tip tab

**Files:**
- Modify: `src/components/WorldCupTip.jsx`
- Modify: `src/components/WorldCup.css`

- [ ] **Step 1: Rewrite `src/components/WorldCupTip.jsx`**

```jsx
import { useState } from "react";
import { OWNERS, STAGE_LABELS } from "../worldcup/constants";
import { upsertTip } from "../worldcup/db";
import { tipPointsForMatch } from "../worldcup/scoring";
import { isPlaceholderTeam } from "../worldcup/feed";

function isLocked(m) {
  if (m.status === "final") return true;
  return m.kickoff ? new Date(m.kickoff) <= new Date() : false;
}

export default function WorldCupTip({ data }) {
  const { matches, tips } = data;
  // Local pending scores for knockout inputs, keyed `${matchId}:${user}`.
  const [draftScores, setDraftScores] = useState({});

  const tipFor = (matchId, user) =>
    tips.find((t) => t.match_id === matchId && t.user_name === user);

  async function pickOutcome(match, user, value) {
    await upsertTip(match.id, user, { pick: value });
  }

  async function saveScore(match, user) {
    const key = `${match.id}:${user}`;
    const d = draftScores[key] || {};
    const h = parseInt(d.home, 10);
    const a = parseInt(d.away, 10);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    await upsertTip(match.id, user, { pred_home: h, pred_away: a });
  }

  // Only matches with two real teams are tippable / shown.
  const visible = matches.filter(
    (m) => !isPlaceholderTeam(m.home_team) && !isPlaceholderTeam(m.away_team)
  );

  if (visible.length === 0) {
    return <div className="wc-empty">No fixtures yet — tap 🔄 Refresh, or check back once the schedule loads.</div>;
  }

  return (
    <div className="wc-tip-list">
      {visible.map((m) => {
        const locked = isLocked(m);
        const isFinal = m.status === "final";
        const isGroup = m.stage === "group";
        return (
          <div key={m.id} className="wc-card wc-match">
            <div className="wc-match-top">
              <span className="wc-stage">{STAGE_LABELS[m.stage]}</span>
              {isFinal && (
                <span className="wc-score">{m.home_score}–{m.away_score}{m.winner_team ? ` (${m.winner_team} pens)` : ""}</span>
              )}
            </div>
            <div className="wc-teams-row">
              <span>{m.home_team}</span>
              <span className="wc-vs">v</span>
              <span>{m.away_team}</span>
            </div>

            {OWNERS.map((user) => {
              const tip = tipFor(m.id, user);
              const pts = isFinal ? tipPointsForMatch(m, tip) : null;
              const key = `${m.id}:${user}`;
              const draft = draftScores[key] || {};
              return (
                <div key={user} className="wc-pick-row">
                  <span className="wc-pick-user">{user}</span>

                  {isGroup ? (
                    <div className="wc-pick-btns">
                      {[["home", "Home"], ["draw", "Draw"], ["away", "Away"]].map(([val, label]) => (
                        <button
                          key={val}
                          disabled={locked}
                          className={"wc-pick" + (tip?.pick === val ? " chosen" : "")}
                          onClick={() => pickOutcome(m, user, val)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="wc-score-entry">
                      <input
                        type="number" min="0" inputMode="numeric"
                        aria-label={`${user} ${m.home_team} score`}
                        disabled={locked}
                        defaultValue={tip?.pred_home ?? ""}
                        onChange={(e) => setDraftScores((s) => ({ ...s, [key]: { ...s[key], home: e.target.value } }))}
                        onBlur={() => saveScore(m, user)}
                      />
                      <span className="wc-vs">–</span>
                      <input
                        type="number" min="0" inputMode="numeric"
                        aria-label={`${user} ${m.away_team} score`}
                        disabled={locked}
                        defaultValue={tip?.pred_away ?? ""}
                        onChange={(e) => setDraftScores((s) => ({ ...s, [key]: { ...s[key], away: e.target.value } }))}
                        onBlur={() => saveScore(m, user)}
                      />
                      {!isFinal && tip && tip.pred_home != null && (
                        <span className="wc-saved">saved {tip.pred_home}–{tip.pred_away}</span>
                      )}
                    </div>
                  )}

                  {isFinal && tip && (
                    <span className={"wc-tick" + (pts > 0 ? " ok" : " no")}>
                      {pts > 0 ? `+${pts}` : "✗"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
```

Note: the grade shown (`+N` / `✗`) comes from `tipPointsForMatch`. Ensure no imports are left unused — `npm run lint` must be clean (lowercase unused vars are flagged).

- [ ] **Step 2: Add styles** — append to `src/components/WorldCup.css`

```css
.wc-score-entry { display: flex; align-items: center; gap: 0.4rem; flex: 1; }
.wc-score-entry input {
  width: 2.6rem; min-height: 40px; padding: 0.3rem; text-align: center;
  background: var(--input-bg); border: 1px solid var(--border); border-radius: 10px;
  color: var(--text); font-family: inherit; font-weight: 800;
}
.wc-score-entry input:disabled { opacity: 0.55; }
.wc-saved { font-size: 0.72rem; color: var(--text); opacity: 0.55; }
```

- [ ] **Step 3: Verify**

Run: `npm run lint` (expect 0) and `npm run build` (expect success).

- [ ] **Step 4: Commit**

```bash
git add src/components/WorldCupTip.jsx src/components/WorldCup.css
git commit -m "feat(worldcup): group buttons + knockout score inputs; lock at kickoff"
```

---

## Task 7: Setup + page wiring

**Files:**
- Modify: `src/components/WorldCupSetup.jsx`
- Modify: `src/components/WorldCup.jsx`

- [ ] **Step 1: Rewrite `src/components/WorldCupSetup.jsx`** (drop add-team/add-match; keep draw; add Sync)

```jsx
import { useState } from "react";
import { MAIN_TEAMS, OWNERS } from "../worldcup/constants";
import { setTeamOwner, clearOwners } from "../worldcup/db";
import { drawDarkHorses } from "../worldcup/draw";

export default function WorldCupSetup({ data, onClose, onSync }) {
  const { teams } = data;
  const [busy, setBusy] = useState(false);

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

  async function handleSync() {
    setBusy(true);
    try {
      await onSync();
    } catch (err) {
      alert("Sync failed: " + err.message);
    }
    setBusy(false);
  }

  return (
    <div className="wc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wc-modal">
        <div className="wc-modal-head">
          <h2>Setup</h2>
          <button className="wc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <section className="wc-setup-section">
          <h3>Fixtures &amp; results</h3>
          <p className="wc-muted">{teams.length} teams loaded. Fixtures and scores sync automatically; tap below to refresh now.</p>
          <div className="wc-form-row">
            <button disabled={busy} onClick={handleSync}>🔄 Sync now</button>
          </div>
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

- [ ] **Step 2: Update `src/components/WorldCup.jsx`** to sync on mount and pass `onSync`

Add the import near the other worldcup imports:

```jsx
import { syncWorldCup } from "../worldcup/sync";
```

Replace the existing mount effect's body so it syncs first, then loads, then subscribes. Replace:

```jsx
  useEffect(() => {
    fetchAll().then(setData).catch(() => {});
    const channel = supabase
```

with:

```jsx
  useEffect(() => {
    // Refresh from the public feed on open, then load whatever's in the DB.
    syncWorldCup()
      .catch((e) => console.warn("World Cup sync failed:", e.message))
      .finally(() => fetchAll().then(setData).catch(() => {}));
    const channel = supabase
```

Then pass the handler to Setup — change:

```jsx
        {showSetup && <WorldCupSetup data={data} onClose={() => setShowSetup(false)} />}
```

to:

```jsx
        {showSetup && (
          <WorldCupSetup
            data={data}
            onClose={() => setShowSetup(false)}
            onSync={async () => { await syncWorldCup(); await load(); }}
          />
        )}
```

- [ ] **Step 3: Verify**

Run: `npm run lint` (expect 0) and `npm run build` (expect success).

- [ ] **Step 4: Commit**

```bash
git add src/components/WorldCupSetup.jsx src/components/WorldCup.jsx
git commit -m "feat(worldcup): auto-sync on open, Sync-now button, drop manual setup forms"
```

---

## Task 8: End-to-end verification + live seed

**Files:** none (verification).

- [ ] **Step 1: Full unit suite + lint + build**

Run: `npx vitest run` (all pass), `npm run lint` (0), `npm run build` (success).

- [ ] **Step 2: Confirm the live feed is reachable and well-formed**

Run:
```bash
node --input-type=module -e "import('./src/worldcup/feed.js').then(async ({mapFeedMatch,extractTeams})=>{const r=await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');const j=await r.json();const rows=j.matches.map(mapFeedMatch).filter(Boolean);console.log('matches mapped:',rows.length,'teams:',extractTeams(j.matches).length,'sample:',JSON.stringify(rows[0]));})"
```
Expected: prints a non-zero match count, ~48 teams, and a sample row with a real `ext_key`, `stage`, and ISO `kickoff`. If the feed shape differs from the mappers, fix `feed.js` and its tests before continuing.

- [ ] **Step 3: Seed the real data once via the Supabase MCP** (so the page isn't empty on first open)

Using the mapped output, the simplest path is to let the deployed app's on-open sync populate it. For an immediate seed during verification, run the sync logic against the project by inserting the mapped rows through the Supabase MCP `execute_sql`/`apply_migration` is **not** appropriate (data, not DDL). Instead, verify by opening the deployed preview and confirming fixtures appear, then proceed. (No code change.)

- [ ] **Step 4: Manual smoke test (preview/live)**

On the running app: open World Cup → fixtures appear after the on-open sync → tip a group game (Home/Draw/Away) and a knockout game (score inputs) → both persist and lock at kickoff. Open ⚙️ → Assign mains → Draw dark horses → check My Teams. Confirm the leaderboard reflects any finished games.

---

## Self-Review Notes

- **Spec coverage:** keyless feed + client sync (Tasks 2, 4, 7); idempotent ext_key + schema (Task 1); round→stage / placeholder / kickoff mapping (Task 2); group=simple-1pt, knockout=exact-3/result-1 graded on FT, penalties ignored for tips (Task 3); penalties→winner_team for sweepstakes (Task 2 `mapFeedMatch`); auto main assignment (Task 4); lock at kickoff + hide placeholders + no manual entry (Task 6); Setup slimmed + Sync button (Task 7). Covered.
- **Type consistency:** `upsertTip(matchId, user, fields)` signature is used identically in Task 6. `tipPointsForMatch`, `groupTipPoints`, `knockoutTipPoints`, `syncWorldCup`, `mapFeedMatch`, `extractTeams`, `isPlaceholderTeam` names match across defining and calling tasks.
- **Dead code:** removed `saveResult`/`addTeam`/`addMatch` (Task 5) and their only callers were the old Setup/Tip, replaced in Tasks 6–7.
- **YAGNI:** no cron/serverless/API key; third-place play-off skipped; group stays simple.
