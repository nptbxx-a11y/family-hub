// src/worldcup/scoring.test.js
import { describe, it, expect } from "vitest";
import {
  outcomeFromScore,
  matchWinner,
  resultForTip,
  tipPoints,
} from "./scoring.js";

describe("outcomeFromScore", () => {
  it("returns home/away/draw", () => {
    expect(outcomeFromScore(2, 1)).toBe("home");
    expect(outcomeFromScore(0, 3)).toBe("away");
    expect(outcomeFromScore(1, 1)).toBe("draw");
  });
  it("returns null when a score is missing", () => {
    expect(outcomeFromScore(null, 1)).toBe(null);
    expect(outcomeFromScore(2, undefined)).toBe(null);
  });
});

describe("matchWinner", () => {
  const base = { home_team: "A", away_team: "B", status: "final" };
  it("derives from score", () => {
    expect(matchWinner({ ...base, home_score: 2, away_score: 0 })).toBe("A");
    expect(matchWinner({ ...base, home_score: 0, away_score: 2 })).toBe("B");
  });
  it("uses winner_team for a level knockout (penalties)", () => {
    expect(
      matchWinner({ ...base, home_score: 1, away_score: 1, winner_team: "B" })
    ).toBe("B");
  });
  it("is null for an unfinished match", () => {
    expect(matchWinner({ ...base, status: "scheduled" })).toBe(null);
  });
});

describe("resultForTip", () => {
  it("group: raw outcome including draw", () => {
    expect(
      resultForTip({ stage: "group", status: "final", home_team: "A", away_team: "B", home_score: 1, away_score: 1 })
    ).toBe("draw");
  });
  it("knockout: maps decisive winner to home/away", () => {
    expect(
      resultForTip({ stage: "qf", status: "final", home_team: "A", away_team: "B", home_score: 1, away_score: 1, winner_team: "A" })
    ).toBe("home");
  });
});

describe("tipPoints", () => {
  it("awards stage points for a correct pick", () => {
    expect(tipPoints("group", "home", "home")).toBe(1);
    expect(tipPoints("final", "away", "away")).toBe(13);
  });
  it("awards nothing for a wrong or missing pick", () => {
    expect(tipPoints("group", "home", "away")).toBe(0);
    expect(tipPoints("group", null, "home")).toBe(0);
  });
});
