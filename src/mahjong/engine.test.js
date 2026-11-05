// src/mahjong/engine.test.js
import { describe, it, expect } from "vitest";
import { isFree, canMatch, findHint, newGame, reshuffle, removePair } from "./engine.js";
import { matchKey } from "./tiles.js";
import { LAYOUTS } from "./layouts.js";

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
  for (const [id, { name, positions }] of Object.entries(LAYOUTS)) {
    it(`deals a full, solvable ${name} board`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const tiles = newGame(id, seeded(seed));
        expect(tiles).toHaveLength(positions.length);
        expect(new Set(tiles.map((t) => t.id)).size).toBe(positions.length);
        expect(solvesInOrder(tiles)).toBe(true);
      }
    });
  }
});

describe("reshuffle", () => {
  it("re-deals the remaining tiles into a solvable board with the same faces", () => {
    const rng = seeded(42);
    const remaining = newGame("pyramid", rng).slice(20); // first 10 moves played
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
