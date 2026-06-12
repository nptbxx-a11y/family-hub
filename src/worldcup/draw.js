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
