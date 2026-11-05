// src/mahjong/layouts.js
// Board layouts as [x, y, z] in half-tile units: a tile spans 2×2 units on
// layer z, so a tile can sit half a tile offset from those below it.
// Quick layouts are 72 tiles (≤ 8 wide); Classic layouts are 144 (≤ 15 wide).

function rect(cols, rows, x0, y0, z) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out.push([x0 + c * 2, y0 + r * 2, z]);
  }
  return out;
}

// Rows of [widthInTiles, y], centred on half-unit column cx, on layer z.
const centredRows = (rows, cx, z) => rows.flatMap(([w, y]) => rect(w, 1, cx - w, y, z));

export const LAYOUTS = {
  // ---- Quick (72) ----
  pyramid: {
    mode: "quick", name: "Pyramid",
    positions: [...rect(8, 5, 0, 0, 0), ...rect(6, 4, 2, 1, 1), ...rect(4, 2, 4, 3, 2)],
  },
  towers: {
    mode: "quick", name: "Twin Towers",
    positions: [
      ...rect(8, 5, 0, 0, 0),
      ...rect(3, 4, 0, 1, 1), ...rect(3, 4, 10, 1, 1),
      ...rect(2, 2, 1, 3, 2), ...rect(2, 2, 11, 3, 2),
    ],
  },
  stairs: {
    mode: "quick", name: "Staircase",
    positions: [...rect(8, 4, 0, 0, 0), ...rect(6, 4, 4, 0, 1), ...rect(4, 4, 8, 0, 2)],
  },
  cross: {
    mode: "quick", name: "Cross",
    positions: [
      ...rect(8, 3, 0, 4, 0), ...rect(3, 2, 5, 0, 0), ...rect(3, 2, 5, 10, 0),
      ...rect(6, 3, 2, 4, 1), ...rect(3, 1, 5, 2, 1), ...rect(3, 1, 5, 10, 1),
      ...rect(4, 3, 4, 4, 2),
    ],
  },
  diamond: {
    mode: "quick", name: "Diamond",
    positions: [
      ...centredRows([[4, 0], [6, 2], [8, 4], [8, 6], [6, 8], [4, 10]], 8, 0),
      ...centredRows([[5, 2], [7, 4], [7, 6], [5, 8]], 8, 1),
      ...centredRows([[4, 4], [4, 6]], 8, 2),
      ...centredRows([[2, 4], [2, 6]], 8, 3),
    ],
  },

  // ---- Classic (144) ----
  turtle: {
    mode: "classic", name: "Turtle",
    positions: [
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
    ],
  },
  ziggurat: {
    mode: "classic", name: "Ziggurat",
    positions: [...rect(12, 6, 0, 0, 0), ...rect(10, 5, 1, 1, 1), ...rect(6, 3, 5, 3, 2), ...rect(2, 2, 9, 4, 3)],
  },
  fortress: {
    mode: "classic", name: "Fortress",
    positions: [
      ...rect(13, 8, 0, 0, 0),
      ...rect(3, 3, 1, 1, 1), ...rect(3, 3, 19, 1, 1), ...rect(3, 3, 1, 9, 1), ...rect(3, 3, 19, 9, 1),
      [3, 3, 2], [21, 3, 2], [3, 11, 2], [21, 11, 2], // tower tops
    ],
  },
  butterfly: {
    mode: "classic", name: "Butterfly",
    positions: [
      ...rect(6, 6, 0, 1, 0), ...rect(6, 6, 16, 1, 0), ...rect(2, 7, 12, 0, 0),
      ...rect(4, 4, 2, 3, 1), ...rect(4, 4, 18, 3, 1), ...rect(2, 5, 12, 2, 1),
      ...rect(2, 2, 4, 5, 2), ...rect(2, 2, 20, 5, 2), ...rect(2, 3, 12, 4, 2),
      [13, 5, 3], [13, 7, 3],
    ],
  },
  mountains: {
    mode: "classic", name: "Mountains",
    positions: [
      ...rect(14, 6, 0, 0, 0),
      ...rect(5, 4, 1, 1, 1), ...rect(5, 4, 17, 1, 1),
      ...rect(4, 2, 2, 3, 2), ...rect(4, 2, 18, 3, 2),
      ...rect(2, 1, 4, 4, 3), ...rect(2, 1, 20, 4, 3),
    ],
  },
};

// The original layout per size — used for games saved before layouts existed.
export const DEFAULT_LAYOUT = { quick: "pyramid", classic: "turtle" };

export const layoutIdsFor = (mode) => Object.keys(LAYOUTS).filter((id) => LAYOUTS[id].mode === mode);

// A random layout id for the size, avoiding `exclude` (the one just played).
export function randomLayout(mode, rng = Math.random, exclude = null) {
  const ids = layoutIdsFor(mode);
  const choices = ids.length > 1 ? ids.filter((id) => id !== exclude) : ids;
  return choices[Math.floor(rng() * choices.length)];
}

// Board extent in half-tile units, plus the number of layers.
export function layoutBounds(layoutId) {
  const { positions } = LAYOUTS[layoutId];
  return {
    w: Math.max(...positions.map(([x]) => x)) + 2,
    h: Math.max(...positions.map(([, y]) => y)) + 2,
    layers: Math.max(...positions.map(([, , z]) => z)) + 1,
  };
}
