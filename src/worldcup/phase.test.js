// src/worldcup/phase.test.js
import { describe, it, expect } from "vitest";
import { currentRound, phaseLabel } from "./phase.js";

const f = (stage, status) => ({ stage, status });

describe("currentRound", () => {
  it("returns group while group games remain", () => {
    expect(currentRound([f("group", "scheduled"), f("r32", "scheduled")])).toBe("group");
  });
  it("returns the earliest unfinished knockout round", () => {
    expect(
      currentRound([f("group", "final"), f("r32", "final"), f("r16", "scheduled"), f("qf", "scheduled")])
    ).toBe("r16");
  });
  it("returns final when everything is played", () => {
    expect(currentRound([f("group", "final"), f("final", "final")])).toBe("final");
  });
});

describe("phaseLabel", () => {
  it("labels the group stage", () => {
    expect(phaseLabel([f("group", "scheduled")])).toMatch(/group stage/i);
  });
  it("labels the knockout stage", () => {
    expect(phaseLabel([f("group", "final"), f("r16", "scheduled")])).toMatch(/knockout/i);
  });
  it("crowns the champions when the final is done", () => {
    expect(phaseLabel([f("final", "final")])).toMatch(/champions/i);
  });
});
