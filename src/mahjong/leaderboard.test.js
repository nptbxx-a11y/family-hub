// src/mahjong/leaderboard.test.js
import { describe, it, expect } from "vitest";
import { summarize, leaderOf, isPersonalBest, formatTime } from "./leaderboard.js";

const score = (player, mode, seconds, assisted = false) => ({ player, mode, seconds, assisted });

describe("summarize", () => {
  const scores = [
    score("ozzy", "quick", 200),
    score("ozzy", "quick", 150),
    score("ozzy", "quick", 90, true), // assisted: counts as a win, not as a best
    score("tommy", "quick", 170),
    score("tommy", "classic", 600),
  ];

  it("takes each player's best clean time and counts all wins, for one mode", () => {
    const rows = summarize(scores, "quick");
    expect(rows).toEqual([
      { player: "ozzy", best: 150, wins: 3 },
      { player: "tommy", best: 170, wins: 1 },
    ]);
  });

  it("puts players with no clean time last", () => {
    const rows = summarize([score("ozzy", "classic", 500, true), score("tommy", "classic", 700)], "classic");
    expect(rows.map((r) => r.player)).toEqual(["tommy", "ozzy"]);
    expect(rows[1]).toEqual({ player: "ozzy", best: null, wins: 1 });
  });

  it("returns both players even with no scores", () => {
    expect(summarize([], "quick")).toEqual([
      { player: "ozzy", best: null, wins: 0 },
      { player: "tommy", best: null, wins: 0 },
    ]);
  });
});

describe("leaderOf", () => {
  it("is the player with the fastest best time", () => {
    expect(leaderOf(summarize([score("tommy", "quick", 99), score("ozzy", "quick", 120)], "quick"))).toBe("tommy");
  });
  it("leads alone when only one player has a time", () => {
    expect(leaderOf(summarize([score("ozzy", "quick", 300)], "quick"))).toBe("ozzy");
  });
  it("has no leader on a tie or with no times", () => {
    expect(leaderOf(summarize([score("ozzy", "quick", 100), score("tommy", "quick", 100)], "quick"))).toBe(null);
    expect(leaderOf(summarize([], "quick"))).toBe(null);
  });
});

describe("isPersonalBest", () => {
  const scores = [score("ozzy", "quick", 150), score("ozzy", "quick", 60, true)];
  it("is true for a first clean time or a faster one", () => {
    expect(isPersonalBest(scores, "tommy", "quick", 400)).toBe(true);
    expect(isPersonalBest(scores, "ozzy", "quick", 140)).toBe(true);
  });
  it("is false for a slower or equal time, ignoring assisted games", () => {
    expect(isPersonalBest(scores, "ozzy", "quick", 150)).toBe(false);
    expect(isPersonalBest(scores, "ozzy", "quick", 100)).toBe(true); // the 60 was assisted
  });
});

describe("formatTime", () => {
  it("formats seconds as m:ss", () => {
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(125)).toBe("2:05");
  });
});
