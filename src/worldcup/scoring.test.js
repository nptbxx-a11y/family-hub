// src/worldcup/scoring.test.js
import { describe, it, expect } from "vitest";
import {
  outcomeFromScore,
  matchWinner,
  resultForTip,
  tipPoints,
  groupMatchBonus,
  reachedKnockouts,
  sweepstakesPoints,
  tipTotal,
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

describe("groupMatchBonus", () => {
  const m = (o) => ({ stage: "group", status: "final", home_team: "AUS", away_team: "X", ...o });
  it("rewards a win and a draw", () => {
    expect(groupMatchBonus("AUS", m({ home_score: 2, away_score: 0 }))).toBe(2);
    expect(groupMatchBonus("AUS", m({ home_score: 1, away_score: 1 }))).toBe(1);
  });
  it("gives nothing for a loss or an unrelated match", () => {
    expect(groupMatchBonus("AUS", m({ home_score: 0, away_score: 1 }))).toBe(0);
    expect(groupMatchBonus("AUS", m({ home_team: "Y", home_score: 3, away_score: 0 }))).toBe(0);
  });
});

describe("reachedKnockouts", () => {
  it("is true when the team appears in any knockout fixture", () => {
    const matches = [{ stage: "r32", home_team: "AUS", away_team: "Z" }];
    expect(reachedKnockouts("AUS", matches)).toBe(true);
    expect(reachedKnockouts("Q", matches)).toBe(false);
  });
});

describe("sweepstakesPoints", () => {
  // AUS: wins a group game (+2), reaches knockouts (+5), wins R32 (+5) = 12
  const matches = [
    { stage: "group", status: "final", home_team: "AUS", away_team: "X", home_score: 1, away_score: 0 },
    { stage: "r32", status: "final", home_team: "AUS", away_team: "Z", home_score: 2, away_score: 1 },
  ];
  it("totals a main team's bonuses at single rate", () => {
    expect(sweepstakesPoints("AUS", "main", matches)).toBe(12);
  });
  it("doubles a dark horse's bonuses", () => {
    expect(sweepstakesPoints("AUS", "darkhorse", matches)).toBe(24);
  });
  it("stacks knockout-round-win and tournament-win on the final", () => {
    const finalOnly = [
      { stage: "final", status: "final", home_team: "CHAMP", away_team: "RUNNER", home_score: 2, away_score: 1 },
    ];
    // reachedKnockouts(5) + knockoutRoundWin(5) + winTournament(25) = 35
    expect(sweepstakesPoints("CHAMP", "main", finalOnly)).toBe(35);
    // dark horse doubles the whole total
    expect(sweepstakesPoints("CHAMP", "darkhorse", finalOnly)).toBe(70);
  });
});

describe("tipTotal", () => {
  const matches = [
    { id: "1", stage: "group", status: "final", home_team: "A", away_team: "B", home_score: 2, away_score: 0 },
    { id: "2", stage: "final", status: "final", home_team: "A", away_team: "B", home_score: 1, away_score: 1, winner_team: "A" },
  ];
  const tips = [
    { match_id: "1", user_name: "Ozzy", pick: "home" }, // +1
    { match_id: "2", user_name: "Ozzy", pick: "home" }, // +13 (knockout winner = home)
    { match_id: "1", user_name: "Tommy", pick: "draw" }, // +0
  ];
  it("sums a user's correct tips across stages", () => {
    expect(tipTotal("Ozzy", tips, matches)).toBe(14);
    expect(tipTotal("Tommy", tips, matches)).toBe(0);
  });
});
