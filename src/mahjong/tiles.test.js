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
