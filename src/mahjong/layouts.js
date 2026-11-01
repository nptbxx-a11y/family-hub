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
