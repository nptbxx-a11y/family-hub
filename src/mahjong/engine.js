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
