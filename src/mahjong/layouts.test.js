// src/mahjong/layouts.test.js
import { describe, it, expect } from "vitest";
import { LAYOUTS, DEFAULT_LAYOUT, layoutIdsFor, randomLayout, layoutBounds } from "./layouts.js";

const SIZE = { quick: 72, classic: 144 };
const MAX_WIDTH_TILES = { quick: 8, classic: 15 };
const overlaps = ([x, y], [x2, y2]) => Math.abs(x - x2) < 2 && Math.abs(y - y2) < 2;

describe("every layout", () => {
  for (const [id, { mode, name, positions }] of Object.entries(LAYOUTS)) {
    describe(`${name} (${mode})`, () => {
      it(`has exactly ${SIZE[mode]} tiles`, () => {
        expect(positions).toHaveLength(SIZE[mode]);
      });
      it("fits on a phone", () => {
        expect(layoutBounds(id).w / 2).toBeLessThanOrEqual(MAX_WIDTH_TILES[mode]);
      });
      it("never puts two tiles in the same spot on a layer", () => {
        const clash = positions.some((a, i) =>
          positions.some((b, j) => i !== j && a[2] === b[2] && overlaps(a, b)));
        expect(clash).toBe(false);
      });
      it("has no floating tiles", () => {
        const floating = positions.filter((t) =>
          t[2] > 0 && !positions.some((u) => u[2] === t[2] - 1 && overlaps(t, u)));
        expect(floating).toEqual([]);
      });
    });
  }
});

describe("layout sets", () => {
  it("offers five layouts per size, including the originals", () => {
    expect(layoutIdsFor("quick")).toHaveLength(5);
    expect(layoutIdsFor("classic")).toHaveLength(5);
    expect(DEFAULT_LAYOUT).toEqual({ quick: "pyramid", classic: "turtle" });
  });
  it("reports board size and depth", () => {
    expect(layoutBounds("pyramid")).toEqual({ w: 16, h: 10, layers: 3 });
    expect(layoutBounds("turtle")).toEqual({ w: 30, h: 16, layers: 5 });
  });
});

describe("randomLayout", () => {
  it("picks a layout of the requested size", () => {
    for (let i = 0; i < 20; i++) {
      expect(LAYOUTS[randomLayout("quick")].mode).toBe("quick");
      expect(LAYOUTS[randomLayout("classic")].mode).toBe("classic");
    }
  });
  it("never repeats the layout just played", () => {
    for (let i = 0; i < 50; i++) expect(randomLayout("quick", Math.random, "pyramid")).not.toBe("pyramid");
  });
  it("can land on every layout", () => {
    const seen = new Set();
    for (let i = 0; i < 300; i++) seen.add(randomLayout("classic"));
    expect([...seen].sort()).toEqual(layoutIdsFor("classic").sort());
  });
});
