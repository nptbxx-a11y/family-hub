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
