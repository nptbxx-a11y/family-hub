// src/worldcup/draw.test.js
import { describe, it, expect } from "vitest";
import { darkHorsePool, drawDarkHorses } from "./draw.js";

const teams = [
  { name: "England", is_favourite: true },
  { name: "Australia", is_favourite: false },
  { name: "Spain", is_favourite: true },
  { name: "Ghana", is_favourite: false },
  { name: "Japan", is_favourite: false },
  { name: "Norway", is_favourite: false },
  { name: "Ecuador", is_favourite: false },
  { name: "Morocco", is_favourite: false },
];

describe("darkHorsePool", () => {
  it("excludes favourites and the two main teams", () => {
    const pool = darkHorsePool(teams);
    expect(pool).not.toContain("England");
    expect(pool).not.toContain("Australia");
    expect(pool).not.toContain("Spain");
    expect(pool).toContain("Ghana");
    expect(pool).toContain("Morocco");
  });
});

describe("drawDarkHorses", () => {
  it("gives each owner two non-overlapping teams from the pool", () => {
    const result = drawDarkHorses(teams, 2, () => 0);
    expect(result.Ozzy).toHaveLength(2);
    expect(result.Tommy).toHaveLength(2);
    const all = [...result.Ozzy, ...result.Tommy];
    expect(new Set(all).size).toBe(4);
    const pool = darkHorsePool(teams);
    all.forEach((name) => expect(pool).toContain(name));
  });
  it("throws when the pool is too small", () => {
    const tiny = [{ name: "Ghana", is_favourite: false }];
    expect(() => drawDarkHorses(tiny, 2)).toThrow();
  });
});
