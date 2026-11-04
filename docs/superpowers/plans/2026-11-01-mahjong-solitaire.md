# Mahjong Solitaire + Games Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-player Mahjong Solitaire game (Quick 72 / Classic 144) and a 🎮 Games page that replaces the "All Aboard" sidebar link.

**Architecture:** Pure, unit-tested rules in `src/mahjong/` (tile set, layouts, engine with a guaranteed-solvable dealer). Thin React UI in `src/components/` (page with a reducer, a board that scales tiles to the width, a tile component that draws faces). Game state persisted to `localStorage`; no Supabase changes.

**Tech Stack:** React 19, React Router v7, framer-motion, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-mahjong-solitaire-design.md`

---

## File Structure

**Create**
- `src/mahjong/tiles.js` (+ `tiles.test.js`) — 144-tile set, 72 pairs, match keys, names, emoji.
- `src/mahjong/layouts.js` (+ `layouts.test.js`) — Quick and Classic positions, bounds.
- `src/mahjong/engine.js` (+ `engine.test.js`) — free check, matching, hint, solvable deal, reshuffle.
- `src/components/MahjongTile.jsx` — one tile + face drawing.
- `src/components/MahjongBoard.jsx` — scaling/positioning, exit animation.
- `src/components/Mahjong.jsx` + `Mahjong.css` — page, reducer, persistence, timer, overlays.
- `src/components/GamesHub.jsx` + `GamesHub.css` — Games page.
- `src/components/GamesBackLink.jsx` + `GamesBackLink.css` — "← Games" bar.

**Modify**
- `src/App.jsx` — lazy routes `/games`, `/mahjong`; back link on `/battleships`.
- `src/components/NavBar.jsx` — "⚔️ All Aboard" → "🎮 Games" (active on game pages).
- `CLAUDE.md` — routes and features.

Positions are `[x, y, z]` in **half-tile units**; a tile spans `[x, x+2) × [y, y+2)` on layer `z`.

---

### Task 1: Tile set

**Files:** Create `src/mahjong/tiles.js`, Test `src/mahjong/tiles.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/mahjong/tiles.test.js
import { describe, it, expect } from "vitest";
import { NORMAL_FACES, allPairs, matchKey, tileName } from "./tiles.js";

describe("tile set", () => {
  it("has 34 four-of-a-kind faces", () => {
    expect(NORMAL_FACES).toHaveLength(34);
    expect(new Set(NORMAL_FACES).size).toBe(34);
  });
  it("forms 72 pairs from the full 144 tiles", () => {
    const faces = allPairs().flat();
    expect(allPairs()).toHaveLength(72);
    expect(faces).toHaveLength(144);
    for (const f of NORMAL_FACES) expect(faces.filter((x) => x === f)).toHaveLength(4);
  });
  it("only pairs tiles that match", () => {
    for (const [a, b] of allPairs()) expect(matchKey(a)).toBe(matchKey(b));
  });
});

describe("matchKey", () => {
  it("matches identical faces, and flowers/seasons within their group", () => {
    expect(matchKey("d5")).toBe("d5");
    expect(matchKey("f1")).toBe(matchKey("f4"));
    expect(matchKey("s2")).toBe(matchKey("s3"));
    expect(matchKey("f1")).not.toBe(matchKey("s1"));
    expect(matchKey("wD")).not.toBe(matchKey("wE"));
  });
});

describe("tileName", () => {
  it("names tiles for screen readers", () => {
    expect(tileName("d3")).toBe("3 Dots");
    expect(tileName("wE")).toBe("East Wind");
    expect(tileName("wD")).toBe("White Dragon");
    expect(tileName("f1")).toBe("Cherry blossom (flower)");
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`npx vitest run src/mahjong/tiles.test.js` → module not found)

- [ ] **Step 3: Implement**

```js
// src/mahjong/tiles.js
// The standard 144-tile Mahjong set, grouped into 72 matchable pairs.
// Face ids: d1–d9 dots, b1–b9 bamboo, c1–c9 characters, wE/wS/wW/wN winds,
// rD/gD/wD red/green/white dragons, f1–f4 flowers, s1–s4 seasons.

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const HONOURS = ["wE", "wS", "wW", "wN", "rD", "gD", "wD"];
const FLOWERS = ["f1", "f2", "f3", "f4"];
const SEASONS = ["s1", "s2", "s3", "s4"];

// The 34 faces that come four-of-a-kind.
export const NORMAL_FACES = [
  ...["d", "b", "c"].flatMap((suit) => NUMBERS.map((n) => `${suit}${n}`)),
  ...HONOURS,
];

export const FLOWER_EMOJI = { f1: "🌸", f2: "🌺", f3: "🌼", f4: "🌻" };
export const SEASON_EMOJI = { s1: "🌱", s2: "☀️", s3: "🍂", s4: "❄️" };

// Tiles with the same key can be paired: identical faces, or any flower with
// any flower, any season with any season.
export function matchKey(face) {
  if (face[0] === "f") return "flower";
  if (face[0] === "s") return "season";
  return face;
}

// All 72 pairs of the full set: 34 faces × 2 pairs, plus 2 flower and 2 season pairs.
export function allPairs() {
  const pairs = [];
  for (const face of NORMAL_FACES) pairs.push([face, face], [face, face]);
  pairs.push([FLOWERS[0], FLOWERS[1]], [FLOWERS[2], FLOWERS[3]]);
  pairs.push([SEASONS[0], SEASONS[1]], [SEASONS[2], SEASONS[3]]);
  return pairs;
}

const SUIT_NAMES = { d: "Dots", b: "Bamboo", c: "Characters" };
const HONOUR_NAMES = {
  wE: "East Wind", wS: "South Wind", wW: "West Wind", wN: "North Wind",
  rD: "Red Dragon", gD: "Green Dragon", wD: "White Dragon",
};
const FLOWER_NAMES = { f1: "Cherry blossom", f2: "Hibiscus", f3: "Daisy", f4: "Sunflower" };
const SEASON_NAMES = { s1: "Spring", s2: "Summer", s3: "Autumn", s4: "Winter" };

// Human-readable tile name, for screen readers.
export function tileName(face) {
  if (HONOUR_NAMES[face]) return HONOUR_NAMES[face];
  if (FLOWER_NAMES[face]) return `${FLOWER_NAMES[face]} (flower)`;
  if (SEASON_NAMES[face]) return `${SEASON_NAMES[face]} (season)`;
  return `${face.slice(1)} ${SUIT_NAMES[face[0]]}`;
}
```

- [ ] **Step 4: Run it — expect PASS**
- [ ] **Step 5: Commit** — `git add src/mahjong/tiles.js src/mahjong/tiles.test.js && git commit -m "feat(mahjong): tile set and matching rules"`

---

### Task 2: Layouts

**Files:** Create `src/mahjong/layouts.js`, Test `src/mahjong/layouts.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/mahjong/layouts.test.js
import { describe, it, expect } from "vitest";
import { QUICK, CLASSIC, layoutBounds } from "./layouts.js";

const sameLayerOverlap = (layout) =>
  layout.some(([x, y, z], i) =>
    layout.some(([x2, y2, z2], j) =>
      i !== j && z === z2 && Math.abs(x - x2) < 2 && Math.abs(y - y2) < 2));

describe("layouts", () => {
  it("Quick has 72 tiles and Classic has 144", () => {
    expect(QUICK).toHaveLength(72);
    expect(CLASSIC).toHaveLength(144);
  });
  it("never puts two tiles in the same spot on a layer", () => {
    expect(sameLayerOverlap(QUICK)).toBe(false);
    expect(sameLayerOverlap(CLASSIC)).toBe(false);
  });
  it("reports board size and depth", () => {
    expect(layoutBounds("quick")).toEqual({ w: 16, h: 10, layers: 3 });
    expect(layoutBounds("classic")).toEqual({ w: 30, h: 16, layers: 5 });
  });
});
```

- [ ] **Step 2: Run it — expect FAIL**
- [ ] **Step 3: Implement**

```js
// src/mahjong/layouts.js
// Board layouts as [x, y, z] in half-tile units: a tile spans 2×2 units on
// layer z, so a tile can sit half a tile offset from those below it.

function rect(cols, rows, x0, y0, z) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out.push([x0 + c * 2, y0 + r * 2, z]);
  }
  return out;
}

// Quick: a 72-tile pyramid, at most 8 tiles wide so tiles stay big on a phone.
export const QUICK = [
  ...rect(8, 5, 0, 0, 0),
  ...rect(6, 4, 2, 1, 1),
  ...rect(4, 2, 4, 3, 2),
];

// Classic: the traditional 144-tile "Turtle".
export const CLASSIC = [
  ...rect(12, 1, 2, 0, 0),
  ...rect(8, 1, 6, 2, 0),
  ...rect(10, 1, 4, 4, 0),
  ...rect(12, 1, 2, 6, 0),
  ...rect(12, 1, 2, 8, 0),
  ...rect(10, 1, 4, 10, 0),
  ...rect(8, 1, 6, 12, 0),
  ...rect(12, 1, 2, 14, 0),
  [0, 7, 0], [26, 7, 0], [28, 7, 0], // the turtle's head and tail
  ...rect(6, 6, 8, 2, 1),
  ...rect(4, 4, 10, 4, 2),
  ...rect(2, 2, 12, 6, 3),
  [13, 7, 4], // the single top tile
];

export const LAYOUTS = { quick: QUICK, classic: CLASSIC };

// Board extent in half-tile units, plus the number of layers.
export function layoutBounds(mode) {
  const layout = LAYOUTS[mode];
  return {
    w: Math.max(...layout.map(([x]) => x)) + 2,
    h: Math.max(...layout.map(([, y]) => y)) + 2,
    layers: Math.max(...layout.map(([, , z]) => z)) + 1,
  };
}
```

- [ ] **Step 4: Run it — expect PASS**
- [ ] **Step 5: Commit** — `git add src/mahjong/layouts.js src/mahjong/layouts.test.js && git commit -m "feat(mahjong): Quick and Classic layouts"`

---

### Task 3: Engine

**Files:** Create `src/mahjong/engine.js`, Test `src/mahjong/engine.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/mahjong/engine.test.js
import { describe, it, expect } from "vitest";
import { isFree, canMatch, findHint, newGame, reshuffle, removePair } from "./engine.js";
import { matchKey } from "./tiles.js";

// Deterministic RNG (mulberry32) so tests are repeatable.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tile = (id, x, y, z = 0, face = "d1") => ({ id, x, y, z, face });

// Replays a dealt board in its returned order: each consecutive two must be a
// legal matching move. That is what "guaranteed solvable" means.
function solvesInOrder(tiles) {
  let board = [...tiles];
  for (let i = 0; i < tiles.length; i += 2) {
    const [a, b] = [tiles[i], tiles[i + 1]];
    if (!isFree(a, board) || !isFree(b, board) || !canMatch(a, b)) return false;
    board = removePair(board, a, b);
  }
  return board.length === 0;
}

describe("isFree", () => {
  it("frees a tile with an open side", () => {
    const row = [tile(1, 0, 0), tile(2, 2, 0), tile(3, 4, 0)];
    expect(isFree(row[0], row)).toBe(true);
    expect(isFree(row[1], row)).toBe(false);
    expect(isFree(row[2], row)).toBe(true);
  });
  it("blocks a tile with anything on top, even half-offset", () => {
    const under = tile(1, 0, 0, 0);
    const onTop = tile(2, 1, 1, 1);
    expect(isFree(under, [under, onTop])).toBe(false);
    expect(isFree(onTop, [under, onTop])).toBe(true);
  });
  it("counts half-offset neighbours on the same layer", () => {
    const t = tile(1, 2, 2);
    expect(isFree(t, [t, tile(2, 0, 1), tile(3, 4, 3)])).toBe(false);
  });
});

describe("canMatch", () => {
  it("matches identical faces and flowers/seasons within their group", () => {
    expect(canMatch(tile(1, 0, 0, 0, "c7"), tile(2, 4, 0, 0, "c7"))).toBe(true);
    expect(canMatch(tile(1, 0, 0, 0, "f1"), tile(2, 4, 0, 0, "f3"))).toBe(true);
    expect(canMatch(tile(1, 0, 0, 0, "c7"), tile(2, 4, 0, 0, "c8"))).toBe(false);
  });
  it("never matches a tile with itself", () => {
    const t = tile(1, 0, 0, 0, "c7");
    expect(canMatch(t, t)).toBe(false);
  });
});

describe("findHint", () => {
  it("returns a free matching pair", () => {
    const board = [tile(1, 0, 0, 0, "wE"), tile(2, 2, 0, 0, "d1"), tile(3, 4, 0, 0, "wE")];
    expect(findHint(board).map((t) => t.id).sort()).toEqual([1, 3]);
  });
  it("returns null when no free tiles match", () => {
    // The middle East Wind is blocked on both sides, so the winds can't pair.
    const board = [tile(1, 0, 0, 0, "wE"), tile(2, 2, 0, 0, "wE"), tile(3, 4, 0, 0, "d1")];
    expect(findHint(board)).toBe(null);
  });
});

describe("newGame", () => {
  for (const [mode, size] of [["quick", 72], ["classic", 144]]) {
    it(`deals a full, solvable ${mode} board`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const tiles = newGame(mode, seeded(seed));
        expect(tiles).toHaveLength(size);
        expect(new Set(tiles.map((t) => t.id)).size).toBe(size);
        expect(solvesInOrder(tiles)).toBe(true);
      }
    });
  }
});

describe("reshuffle", () => {
  it("re-deals the remaining tiles into a solvable board with the same faces", () => {
    const rng = seeded(42);
    const remaining = newGame("quick", rng).slice(20); // first 10 moves played
    const shuffled = reshuffle(remaining, rng);
    const ids = (ts) => ts.map((t) => t.id).sort((a, b) => a - b);
    const keys = (ts) => ts.map((t) => matchKey(t.face)).sort();
    expect(ids(shuffled)).toEqual(ids(remaining));
    expect(keys(shuffled)).toEqual(keys(remaining));
    expect(solvesInOrder(shuffled)).toBe(true);
  });
  it("returns null when the remaining tiles can never be cleared", () => {
    const stacked = [tile(1, 0, 0, 0, "d1"), tile(2, 0, 0, 1, "d1")];
    expect(reshuffle(stacked)).toBe(null);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL**
- [ ] **Step 3: Implement**

```js
// src/mahjong/engine.js
// Pure Mahjong Solitaire rules. A tile is { id, x, y, z, face } with positions
// in half-tile units (see layouts.js); a board is the array of tiles in play.
import { allPairs, matchKey } from "./tiles.js";
import { LAYOUTS } from "./layouts.js";

export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const overlaps = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

// A tile can be picked if nothing is on top of it and its left or right side is open.
export function isFree(tile, tiles) {
  let left = false;
  let right = false;
  for (const o of tiles) {
    if (o.id === tile.id) continue;
    if (o.z === tile.z + 1 && overlaps(o, tile)) return false;
    if (o.z === tile.z && Math.abs(o.y - tile.y) < 2) {
      if (o.x === tile.x - 2) left = true;
      else if (o.x === tile.x + 2) right = true;
    }
  }
  return !(left && right);
}

export const freeTiles = (tiles) => tiles.filter((t) => isFree(t, tiles));

export const canMatch = (a, b) => a.id !== b.id && matchKey(a.face) === matchKey(b.face);

export const removePair = (tiles, a, b) => tiles.filter((t) => t.id !== a.id && t.id !== b.id);

// One free matching pair, or null if there are no moves left.
export function findHint(tiles) {
  const seen = new Map();
  for (const t of freeTiles(tiles)) {
    const key = matchKey(t.face);
    if (seen.has(key)) return [seen.get(key), t];
    seen.set(key, t);
  }
  return null;
}

// Simulate play: repeatedly remove two random free positions. Returns the
// removal order as [a, b] pairs, or null if it got stuck.
function removalOrder(positions, rng) {
  let remaining = positions;
  const order = [];
  while (remaining.length) {
    const free = shuffle(freeTiles(remaining), rng);
    if (free.length < 2) return null;
    const [a, b] = free;
    order.push([a, b]);
    remaining = remaining.filter((p) => p.id !== a.id && p.id !== b.id);
  }
  return order;
}

// Put the face pairs onto the positions so the board is solvable. The returned
// tiles are in a valid solving order (each consecutive two is a legal move).
// Returns null if no solvable arrangement exists.
export function dealSolvable(positions, pairs, rng = Math.random) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = removalOrder(positions, rng);
    if (!order) continue;
    const faces = shuffle(pairs, rng);
    return order.flatMap(([a, b], i) => [
      { id: a.id, x: a.x, y: a.y, z: a.z, face: faces[i][0] },
      { id: b.id, x: b.x, y: b.y, z: b.z, face: faces[i][1] },
    ]);
  }
  return null;
}

// A fresh, solvable board for "quick" or "classic".
export function newGame(mode, rng = Math.random) {
  const positions = LAYOUTS[mode].map(([x, y, z], id) => ({ id, x, y, z }));
  const pairs = shuffle(allPairs(), rng).slice(0, positions.length / 2);
  const tiles = dealSolvable(positions, pairs, rng);
  if (!tiles) throw new Error(`Could not deal a ${mode} board`);
  return tiles;
}

// Re-deal the faces still in play over the remaining positions, keeping the
// board solvable. Returns null if those positions can't be cleared at all.
export function reshuffle(tiles, rng = Math.random) {
  const byKey = new Map();
  for (const t of tiles) {
    const key = matchKey(t.face);
    byKey.set(key, [...(byKey.get(key) ?? []), t.face]);
  }
  const pairs = [];
  for (const faces of byKey.values()) {
    for (let i = 0; i + 1 < faces.length; i += 2) pairs.push([faces[i], faces[i + 1]]);
  }
  return dealSolvable(tiles, pairs, rng);
}
```

- [ ] **Step 4: Run it — expect PASS** (`npx vitest run src/mahjong`)
- [ ] **Step 5: Commit** — `git add src/mahjong/engine.js src/mahjong/engine.test.js && git commit -m "feat(mahjong): rules engine with guaranteed-solvable dealing"`

---

### Task 4: Tile and board components

**Files:** Create `src/components/MahjongTile.jsx`, `src/components/MahjongBoard.jsx`

- [ ] **Step 1: Create `MahjongTile.jsx`**

```jsx
import { memo } from "react";
import { motion } from "framer-motion";
import { FLOWER_EMOJI, SEASON_EMOJI, tileName } from "../mahjong/tiles";

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const WINDS = { wE: "東", wS: "南", wW: "西", wN: "北" };
const DOT_COLOURS = ["#2f6fb5", "#c0392b", "#2e8b57"];

// Dot centres within a 30×42 face, for 1–9 dots.
const DOTS = {
  1: [[15, 21]],
  2: [[15, 11], [15, 31]],
  3: [[7, 8], [15, 21], [23, 34]],
  4: [[9, 11], [21, 11], [9, 31], [21, 31]],
  5: [[8, 8], [22, 8], [15, 21], [8, 34], [22, 34]],
  6: [[9, 8], [21, 8], [9, 21], [21, 21], [9, 34], [21, 34]],
  7: [[6, 6], [15, 10], [24, 14], [9, 26], [21, 26], [9, 36], [21, 36]],
  8: [[9, 6], [21, 6], [9, 16], [21, 16], [9, 26], [21, 26], [9, 36], [21, 36]],
  9: [[6, 8], [15, 8], [24, 8], [6, 21], [15, 21], [24, 21], [6, 34], [15, 34], [24, 34]],
};

// Bamboo stick centres within a 30×42 face, for 2–9 sticks (1 is drawn specially).
const STICKS = {
  2: [[15, 11], [15, 31]],
  3: [[15, 11], [8, 31], [22, 31]],
  4: [[9, 11], [21, 11], [9, 31], [21, 31]],
  5: [[8, 11], [22, 11], [15, 21], [8, 31], [22, 31]],
  6: [[6, 11], [15, 11], [24, 11], [6, 31], [15, 31], [24, 31]],
  7: [[15, 7], [6, 21], [15, 21], [24, 21], [6, 35], [15, 35], [24, 35]],
  8: [[5, 11], [12, 11], [18, 11], [25, 11], [5, 31], [12, 31], [18, 31], [25, 31]],
  9: [[6, 7], [15, 7], [24, 7], [6, 21], [15, 21], [24, 21], [6, 35], [15, 35], [24, 35]],
};

function Dots({ n }) {
  const r = n === 1 ? 10 : n <= 4 ? 5.5 : 4.2;
  return (
    <svg viewBox="0 0 30 42" className="mj-face-svg" aria-hidden="true">
      {DOTS[n].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={DOT_COLOURS[n === 1 ? 1 : i % 3]}
          stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function Bamboo({ n }) {
  if (n === 1) {
    return (
      <svg viewBox="0 0 30 42" className="mj-face-svg" aria-hidden="true">
        <rect x="12" y="6" width="6" height="32" rx="3" fill="#2e8b57" />
        <circle cx="15" cy="7" r="4.5" fill="#c0392b" />
      </svg>
    );
  }
  const h = n >= 7 ? 11 : 16;
  return (
    <svg viewBox="0 0 30 42" className="mj-face-svg" aria-hidden="true">
      {STICKS[n].map(([cx, cy], i) => (
        <g key={i}>
          <rect x={cx - 2} y={cy - h / 2} width="4" height={h} rx="2" fill="#2e8b57" />
          <rect x={cx - 2.5} y={cy - 0.75} width="5" height="1.5" fill="#17482c" />
        </g>
      ))}
    </svg>
  );
}

function Face({ face }) {
  const kind = face[0];
  const n = Number(face.slice(1));
  if (face === "wD") return <span className="mj-white" />;
  if (face === "rD") return <span className="mj-red">中</span>;
  if (face === "gD") return <span className="mj-green">發</span>;
  if (WINDS[face]) return <span className="mj-wind">{WINDS[face]}</span>;
  if (kind === "f") return <span className="mj-emoji">{FLOWER_EMOJI[face]}</span>;
  if (kind === "s") return <span className="mj-emoji">{SEASON_EMOJI[face]}</span>;
  if (kind === "d") return <Dots n={n} />;
  if (kind === "b") return <Bamboo n={n} />;
  return (
    <span className="mj-char">
      <span className="mj-char-num">{NUMERALS[n - 1]}</span>
      <span className="mj-char-wan">萬</span>
    </span>
  );
}

function MahjongTile({ tile, left, top, width, height, zIndex, free, selected, hinted, onTap }) {
  const classes = ["mj-tile"];
  if (!free) classes.push("blocked");
  if (selected) classes.push("selected");
  if (hinted) classes.push("hinted");
  return (
    <motion.button
      type="button"
      className={classes.join(" ")}
      style={{ left, top, width, height, zIndex }}
      disabled={!free}
      aria-pressed={selected}
      aria-label={tileName(tile.face)}
      onClick={() => onTap(tile)}
      initial={false}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
    >
      <Face face={tile.face} />
    </motion.button>
  );
}

export default memo(MahjongTile);
```

- [ ] **Step 2: Create `MahjongBoard.jsx`**

```jsx
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import MahjongTile from "./MahjongTile";
import { isFree } from "../mahjong/engine";
import { layoutBounds } from "../mahjong/layouts";

const ASPECT = 1.33; // tile height ÷ width
const DEPTH = 0.1;   // per-layer up-left offset, as a fraction of tile width
const MIN_TILE = 14; // px
const MAX_TILE = 64; // px — keeps tiles sensible on big screens

// Fits the board to the available width. Higher layers sit slightly up and to
// the left so the stack reads as 3D; the board's height scrolls with the page.
export default function MahjongBoard({ mode, tiles, selectedId, hintIds, onTap }) {
  const wrapRef = useRef(null);
  const [tw, setTw] = useState(40);
  const { w, h, layers } = layoutBounds(mode);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const perTile = el.clientWidth / (w / 2 + layers * DEPTH);
      setTw(Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(perTile))));
    };
    // ResizeObserver fires once as soon as it starts observing, so this also
    // sets the initial size (no synchronous setState in the effect body).
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, layers]);

  const freeIds = useMemo(
    () => new Set(tiles.filter((t) => isFree(t, tiles)).map((t) => t.id)),
    [tiles]
  );

  const th = tw * ASPECT;
  const off = tw * DEPTH;
  const lift = (z) => (layers - 1 - z) * off;

  return (
    <div className="mj-board-wrap" ref={wrapRef}>
      <MotionConfig reducedMotion="user">
        <div
          className="mj-board"
          style={{ width: (w / 2) * tw + layers * off, height: (h / 2) * th + layers * off, "--tw": `${tw}px` }}
        >
          <AnimatePresence>
            {tiles.map((t) => (
              <MahjongTile
                key={t.id}
                tile={t}
                left={(t.x / 2) * tw + lift(t.z)}
                top={(t.y / 2) * th + lift(t.z)}
                width={tw}
                height={th}
                zIndex={t.z * 2000 + t.y * 40 + t.x}
                free={freeIds.has(t.id)}
                selected={t.id === selectedId}
                hinted={hintIds ? hintIds.includes(t.id) : false}
                onTap={onTap}
              />
            ))}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npx eslint src/components/MahjongTile.jsx src/components/MahjongBoard.jsx` → no errors.
- [ ] **Step 4: Commit** — `git add src/components/MahjongTile.jsx src/components/MahjongBoard.jsx && git commit -m "feat(mahjong): tile faces and scaling board"`

---

### Task 5: Mahjong page

**Files:** Create `src/components/Mahjong.jsx`, `src/components/Mahjong.css`

- [ ] **Step 1: Create `Mahjong.jsx`**

```jsx
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import MahjongBoard from "./MahjongBoard";
import { canMatch, findHint, isFree, newGame, removePair, reshuffle } from "../mahjong/engine";
import { LAYOUTS } from "../mahjong/layouts";
import "./Mahjong.css";

const STORAGE_KEY = "mahjong:v1";
const MODE_LABELS = { quick: "Quick", classic: "Classic" };

// The game in progress is kept on this device only (no database).
function loadGame() {
  try {
    const g = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid = g && LAYOUTS[g.mode] && Array.isArray(g.tiles) && Array.isArray(g.history)
      && Number.isFinite(g.elapsed);
    return valid ? g : null;
  } catch {
    return null;
  }
}

function saveGame(game) {
  try {
    if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (e.g. private browsing): the game still works, it just won't resume.
  }
}

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const fresh = (game) => ({ game, selectedId: null, hintIds: null, notice: null });

function reducer(state, action) {
  const { game } = state;
  switch (action.type) {
    case "start":
      return fresh({ mode: action.mode, tiles: action.tiles, history: [], elapsed: 0 });
    case "menu":
      return fresh(null);
    case "tick":
      return game && game.tiles.length
        ? { ...state, game: { ...game, elapsed: game.elapsed + 1 } }
        : state;
    case "tap": {
      const { tile } = action;
      if (!game || !isFree(tile, game.tiles)) return state;
      if (state.selectedId === tile.id) return { ...state, selectedId: null, hintIds: null };
      const selected = game.tiles.find((t) => t.id === state.selectedId);
      if (selected && canMatch(selected, tile)) {
        return fresh({
          ...game,
          tiles: removePair(game.tiles, selected, tile),
          history: [...game.history, [selected, tile]],
        });
      }
      return { ...state, selectedId: tile.id, hintIds: null, notice: null };
    }
    case "hint": {
      const pair = game && findHint(game.tiles);
      return pair ? { ...state, hintIds: pair.map((t) => t.id) } : state;
    }
    case "shuffle":
      if (!game) return state;
      if (!action.tiles) {
        return { ...state, notice: "These tiles can't be rearranged into a winnable board — start a new game." };
      }
      return fresh({ ...game, tiles: action.tiles, history: [] });
    case "undo": {
      if (!game || !game.history.length) return state;
      const last = game.history[game.history.length - 1];
      return fresh({ ...game, tiles: [...game.tiles, ...last], history: game.history.slice(0, -1) });
    }
    default:
      return state;
  }
}

function ModePicker({ onStart }) {
  return (
    <div className="mj-picker">
      <h1 className="mj-title">🀄 Mahjong</h1>
      <p className="mj-how">
        Tap two matching tiles to clear them. A tile is free when nothing is on top of it and
        its left or right side is open. Flowers match any flower, seasons any season. Clear the
        board to win.
      </p>
      <button type="button" className="mj-pick" onClick={() => onStart("quick")}>
        <span className="mj-pick-name">Quick</span>
        <span className="mj-pick-meta">72 tiles · about 5 minutes · made for your phone</span>
      </button>
      <button type="button" className="mj-pick" onClick={() => onStart("classic")}>
        <span className="mj-pick-name">Classic</span>
        <span className="mj-pick-meta">144 tiles · the traditional Turtle · best turned sideways</span>
      </button>
    </div>
  );
}

export default function Mahjong() {
  const [state, dispatch] = useReducer(reducer, null, () => fresh(loadGame()));
  const { game, selectedId, hintIds, notice } = state;
  const tiles = game?.tiles;
  const playing = !!tiles && tiles.length > 0;
  const won = !!tiles && tiles.length === 0;
  const stuck = useMemo(() => !!tiles && tiles.length > 0 && !findHint(tiles), [tiles]);

  useEffect(() => saveGame(game), [game]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  const onTap = useCallback((tile) => dispatch({ type: "tap", tile }), []);
  const start = (mode) => dispatch({ type: "start", mode, tiles: newGame(mode) });
  const shuffleBoard = () => dispatch({ type: "shuffle", tiles: reshuffle(tiles) });
  const backToMenu = () => {
    if (playing && game.history.length && !window.confirm("Start a new game? This one will be lost.")) return;
    dispatch({ type: "menu" });
  };

  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mj-page">
        {!game ? (
          <ModePicker onStart={start} />
        ) : (
          <>
            <div className="mj-topbar">
              <h1 className="mj-title">
                🀄 Mahjong <span className="mj-mode">{MODE_LABELS[game.mode]}</span>
              </h1>
              <span className="mj-stats">⏱ {formatTime(game.elapsed)} · {tiles.length} left</span>
            </div>
            {game.mode === "classic" && <p className="mj-tip">Tip: turn your phone sideways for bigger tiles.</p>}
            {notice ? (
              <div className="mj-notice" role="status">{notice}</div>
            ) : stuck ? (
              <div className="mj-notice" role="status">
                No moves left.
                <button type="button" onClick={shuffleBoard}>🔀 Shuffle</button>
              </div>
            ) : null}
            <MahjongBoard mode={game.mode} tiles={tiles} selectedId={selectedId} hintIds={hintIds} onTap={onTap} />
            <div className="mj-toolbar">
              <button type="button" onClick={() => dispatch({ type: "hint" })} disabled={!playing || stuck}>💡 Hint</button>
              <button type="button" onClick={shuffleBoard} disabled={!playing}>🔀 Shuffle</button>
              <button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!game.history.length || won}>↩️ Undo</button>
              <button type="button" onClick={backToMenu}>✨ New</button>
            </div>
          </>
        )}
      </div>

      {won && createPortal(
        <div className="mj-win" role="dialog" aria-label="Board cleared">
          <motion.div
            className="mj-win-card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="mj-win-emoji" aria-hidden="true">🎉🀄🎉</div>
            <h2>Board cleared!</h2>
            <p>{MODE_LABELS[game.mode]} · {formatTime(game.elapsed)}</p>
            <div className="mj-win-actions">
              <button type="button" onClick={() => start(game.mode)}>Play again</button>
              <button type="button" className="secondary" onClick={() => dispatch({ type: "menu" })}>Choose board</button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Create `Mahjong.css`**

```css
/* Mahjong Solitaire — ivory tiles on the dark aurora theme. */

.mj-page { max-width: 900px; margin: 0 auto; padding: 8px 12px 24px; color: var(--text); }

.mj-topbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.mj-title { margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text); }
.mj-mode {
  margin-left: 6px; padding: 3px 8px; border-radius: 999px; vertical-align: middle;
  font-size: 0.7rem; color: #c4b5fd; background: rgba(139, 92, 246, 0.18);
}
.mj-stats { font-size: 0.85rem; font-weight: 700; opacity: 0.85; font-variant-numeric: tabular-nums; white-space: nowrap; }
.mj-tip { margin: 0 0 6px; font-size: 0.78rem; opacity: 0.7; }

.mj-notice {
  display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;
  margin: 6px 0; padding: 10px 12px; border-radius: 12px;
  background: rgba(255, 209, 102, 0.12); border: 1px solid rgba(255, 209, 102, 0.45);
  font-weight: 700; font-size: 0.88rem;
}
.mj-notice button {
  min-height: 36px; padding: 6px 12px; border: none; border-radius: 9px;
  background: var(--yellow); color: #1a1530; font-family: inherit; font-weight: 800; cursor: pointer;
}

/* Board */
.mj-board-wrap { width: 100%; display: flex; justify-content: center; padding: 8px 0 14px; }
.mj-board { position: relative; isolation: isolate; }

.mj-tile {
  position: absolute; padding: 0; border: none;
  border-radius: calc(var(--tw) * 0.14);
  background: linear-gradient(160deg, #fffaf0 0%, #f1e6cf 100%);
  box-shadow:
    calc(var(--tw) * 0.07) calc(var(--tw) * 0.09) 0 #b9a77e,
    calc(var(--tw) * 0.1) calc(var(--tw) * 0.14) calc(var(--tw) * 0.2) rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", serif;
  font-weight: 700; line-height: 1; font-size: calc(var(--tw) * 0.56);
  color: #1a1a1a; cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s, box-shadow 0.12s, filter 0.15s;
}
.mj-tile:disabled { cursor: default; opacity: 1; color: #1a1a1a; }
.mj-tile.blocked { filter: brightness(0.62) saturate(0.8); }
.mj-tile.selected {
  transform: translateY(calc(var(--tw) * -0.1));
  box-shadow: 0 0 0 3px #FFD166, 0 0 16px #FFD166, calc(var(--tw) * 0.07) calc(var(--tw) * 0.09) 0 #b9a77e;
}
.mj-tile.hinted {
  box-shadow: 0 0 0 3px #6ee7a8, 0 0 14px #6ee7a8, calc(var(--tw) * 0.07) calc(var(--tw) * 0.09) 0 #b9a77e;
  animation: mj-pulse 0.8s ease-in-out infinite alternate;
}
@keyframes mj-pulse { to { transform: translateY(calc(var(--tw) * -0.06)); } }

/* Faces */
.mj-face-svg { width: 74%; height: 74%; }
.mj-char { display: flex; flex-direction: column; align-items: center; gap: 2%; }
.mj-char-num { font-size: 0.72em; color: #1a1a1a; }
.mj-char-wan { font-size: 0.78em; color: #c0392b; }
.mj-wind { color: #1a1a1a; }
.mj-red { color: #c0392b; font-size: 1.05em; }
.mj-green { color: #2e8b57; font-size: 1.05em; }
.mj-white { width: 56%; height: 68%; border: calc(var(--tw) * 0.07) solid #2f6fb5; border-radius: 3px; }
.mj-emoji { font-size: 0.85em; font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }

/* Toolbar — sticks to the bottom so it stays reachable on the big board */
.mj-toolbar {
  position: sticky; bottom: 10px; z-index: 10;
  display: flex; gap: 6px; padding: 6px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.mj-toolbar button {
  flex: 1; min-height: 44px; padding: 6px 2px;
  border: 1px solid var(--border); border-radius: 10px;
  background: var(--card-item); color: var(--text);
  font-family: inherit; font-weight: 800; font-size: 0.82rem; cursor: pointer;
}
.mj-toolbar button:disabled { opacity: 0.4; cursor: default; }

/* Mode picker */
.mj-picker { display: flex; flex-direction: column; gap: 12px; max-width: 520px; margin: 8px auto 0; }
.mj-how { margin: 0; font-size: 0.9rem; line-height: 1.5; opacity: 0.8; }
.mj-pick {
  display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; text-align: left;
  background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
  color: var(--text); font-family: inherit; cursor: pointer;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.38); transition: transform 0.12s, border-color 0.12s;
}
.mj-pick:hover { border-color: var(--accent); }
.mj-pick:active { transform: scale(0.98); }
.mj-pick-name { font-size: 1.15rem; font-weight: 800; }
.mj-pick-meta { font-size: 0.82rem; opacity: 0.75; }

/* Win overlay (portalled to <body>) */
.mj-win {
  position: fixed; inset: 0; z-index: 2000; padding: 16px;
  display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.6);
}
.mj-win-card {
  width: 100%; max-width: 320px; padding: 24px 20px; text-align: center; color: var(--text);
  background: var(--surface); border: 1px solid var(--yellow); border-radius: 20px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
}
.mj-win-emoji { font-size: 2.2rem; }
.mj-win-card h2 { margin: 8px 0 4px; color: var(--yellow); }
.mj-win-card p { margin: 0 0 16px; opacity: 0.85; font-weight: 700; }
.mj-win-actions { display: flex; gap: 8px; }
.mj-win-actions button {
  flex: 1; min-height: 44px; border: none; border-radius: 10px;
  background: var(--accent); color: #fff; font-family: inherit; font-weight: 800; cursor: pointer;
}
.mj-win-actions button.secondary { background: var(--card-item); color: var(--text); border: 1px solid var(--border); }

@media (orientation: landscape) { .mj-tip { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .mj-tile { transition: none; }
  .mj-tile.hinted { animation: none; }
}
```

- [ ] **Step 3: Verify** — `npx eslint src/components/Mahjong.jsx` → no errors.
- [ ] **Step 4: Commit** — `git add src/components/Mahjong.jsx src/components/Mahjong.css && git commit -m "feat(mahjong): game page with hint, shuffle, undo and resume"`

---

### Task 6: Games page, back link, routes, nav

**Files:** Create `src/components/GamesHub.jsx`, `GamesHub.css`, `GamesBackLink.jsx`, `GamesBackLink.css`; Modify `src/App.jsx`, `src/components/NavBar.jsx`

- [ ] **Step 1: Create `GamesHub.jsx`**

```jsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./GamesHub.css";

const GAMES = [
  { to: "/battleships", icon: "⚔️", name: "All Aboard", blurb: "Battleships for two", badge: "2 players" },
  { to: "/mahjong", icon: "🀄", name: "Mahjong", blurb: "Match the tiles, clear the board", badge: "Solo" },
];

export default function GamesHub() {
  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="games-page">
        <h1 className="games-title">🎮 Games</h1>
        <div className="games-grid">
          {GAMES.map((g) => (
            <Link key={g.to} to={g.to} className="games-card">
              <span className="games-icon" aria-hidden="true">{g.icon}</span>
              <span className="games-name">{g.name}</span>
              <span className="games-blurb">{g.blurb}</span>
              <span className="games-badge">{g.badge}</span>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create `GamesHub.css`**

```css
.games-page { max-width: 640px; margin: 0 auto; padding: 16px; }
.games-title { margin: 0 0 14px; font-size: 1.6rem; font-weight: 800; color: var(--text); }
.games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.games-card {
  display: flex; flex-direction: column; gap: 4px; padding: 18px 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
  color: var(--text); text-decoration: none;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.38); transition: transform 0.15s, border-color 0.15s;
}
.games-card:hover { transform: translateY(-2px); border-color: var(--accent); }
.games-card:active { transform: scale(0.98); }
.games-icon { font-size: 2.2rem; }
.games-name { font-size: 1.1rem; font-weight: 800; }
.games-blurb { font-size: 0.85rem; opacity: 0.75; }
.games-badge {
  align-self: flex-start; margin-top: 6px; padding: 3px 8px; border-radius: 999px;
  font-size: 0.7rem; font-weight: 800; color: #c4b5fd; background: rgba(139, 92, 246, 0.18);
}
@media (prefers-reduced-motion: reduce) { .games-card { transition: none; } }
```

- [ ] **Step 3: Create `GamesBackLink.jsx` and `GamesBackLink.css`**

```jsx
import { Link } from "react-router-dom";
import "./GamesBackLink.css";

// Small "← Games" bar shown above each game.
export default function GamesBackLink() {
  return (
    <div className="games-back-bar">
      <Link to="/games" className="games-back">← Games</Link>
    </div>
  );
}
```

```css
.games-back-bar { max-width: 900px; margin: 0 auto; padding: 10px 16px 0; }
.games-back { color: var(--text); opacity: 0.8; text-decoration: none; font-weight: 700; font-size: 0.9rem; }
.games-back:hover { opacity: 1; }
```

- [ ] **Step 4: Wire routes in `src/App.jsx`**

After `import Login from "./components/Login";` add:
```jsx
import GamesBackLink from "./components/GamesBackLink";
```
After `const WorldCup = lazy(() => import("./components/WorldCup"));` add:
```jsx
const GamesHub = lazy(() => import("./components/GamesHub"));
const Mahjong = lazy(() => import("./components/Mahjong"));
```
Replace `<Route path="/battleships" element={<Battleships />} />` with:
```jsx
          <Route path="/games" element={<GamesHub />} />
          <Route path="/battleships" element={<><GamesBackLink /><Battleships /></>} />
          <Route path="/mahjong" element={<><GamesBackLink /><Mahjong /></>} />
```

- [ ] **Step 5: Update `src/components/NavBar.jsx`**

Change the router import to `import { NavLink, useLocation } from "react-router-dom";`, add below the imports:
```jsx
// The Games link stays highlighted while you're inside any game.
const GAME_PATHS = ["/games", "/battleships", "/mahjong"];
```
Inside `NavBar`, after the `useRef` lines add `const { pathname } = useLocation();`, and replace the "⚔️ All Aboard" `NavLink` with:
```jsx
          <NavLink
            to="/games"
            className={() => "sidebar-link" + (GAME_PATHS.includes(pathname) ? " active" : "")}
            onClick={() => setOpen(false)}
          >
            🎮 Games
          </NavLink>
```

- [ ] **Step 6: Verify** — `npx eslint . && npm run build` → clean.
- [ ] **Step 7: Commit** — `git add src/components/GamesHub.jsx src/components/GamesHub.css src/components/GamesBackLink.jsx src/components/GamesBackLink.css src/App.jsx src/components/NavBar.jsx && git commit -m "feat: Games page; move All Aboard under it and add Mahjong"`

---

### Task 7: Docs

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1:** In **Routing**, after `/feedback` add:
```markdown
- `/games` — Games page (a card per game)
- `/battleships` — All Aboard (Battleships, 2 players)
- `/mahjong` — Mahjong Solitaire (solo)
```
- [ ] **Step 2:** In **Features**, before **Homepage** add:
```markdown
**Games (`GamesHub.jsx`):** the sidebar's single "🎮 Games" link opens a page of game cards. Each game shows a "← Games" bar (`GamesBackLink.jsx`, added in the route).

**Mahjong Solitaire (`Mahjong.jsx`):**
- Quick (72-tile pyramid) or Classic (144-tile Turtle); tap two matching free tiles to remove them
- Rules live in `src/mahjong/` (tiles, layouts, engine) and are unit-tested; deals are guaranteed solvable
- Hint, Shuffle (re-deals remaining tiles, still solvable), Undo, New
- Game in progress saved to `localStorage` (`mahjong:v1`); no database
```
- [ ] **Step 3: Commit** — `git add CLAUDE.md && git commit -m "docs: document Games page and Mahjong"`

---

### Task 8: Verify in a browser, then ship

- [ ] **Step 1:** `npx eslint . && npx vitest run && npm run build` → all clean.
- [ ] **Step 2:** The app is login-gated, so preview Mahjong with a throwaway harness (never committed): a root `mahjong-preview.html` that mounts `<Mahjong />` inside a `BrowserRouter` with `src/index.css`. Run the dev server, open `/mahjong-preview.html` at phone width; check the mode picker, Quick board, selecting and matching, Hint, Undo, Shuffle, the Classic board, and resume after reload. Delete the harness afterwards.
- [ ] **Step 3:** Merge `feature/mahjong` → `main`, push, and confirm the Vercel production deploy is READY.

---

## Self-Review Notes

- **Spec coverage:** Games page + nav + back link (Task 6); Quick/Classic layouts (2); free rule, matching, flowers/seasons (1, 3); solvable dealing (3); hint/shuffle/undo/new, blocked shading, timer, no-moves banner, win overlay (4–5); localStorage resume (5); faces drawn in-app (4); docs (7). All covered.
- **Names are consistent across tasks:** `isFree`, `canMatch`, `findHint`, `removePair`, `newGame`, `reshuffle`, `dealSolvable`, `layoutBounds`, `LAYOUTS`, `matchKey`, `tileName`, `FLOWER_EMOJI`, `SEASON_EMOJI`.
- **No DB changes** → RLS rules unaffected.
