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
