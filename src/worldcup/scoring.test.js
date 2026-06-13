// src/worldcup/scoring.test.js
import { describe, it, expect } from "vitest";
import {
  outcomeFromScore,
  matchWinner,
  groupMatchBonus,
  reachedKnockouts,
  sweepstakesPoints,
  groupTipPoints,
  knockoutTipPoints,
  tipPointsForMatch,
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

describe("groupTipPoints", () => {
  it("1 point for the correct result, else 0", () => {
    expect(groupTipPoints("home", 2, 0)).toBe(1);
    expect(groupTipPoints("draw", 1, 1)).toBe(1);
    expect(groupTipPoints("home", 0, 2)).toBe(0);
    expect(groupTipPoints(null, 1, 0)).toBe(0);
  });
});

describe("knockoutTipPoints", () => {
  it("3 for exact, 1 for right result, 0 otherwise", () => {
    expect(knockoutTipPoints(2, 1, 2, 1)).toBe(3);
    expect(knockoutTipPoints(2, 1, 3, 0)).toBe(1);
    expect(knockoutTipPoints(2, 1, 0, 1)).toBe(0);
  });
  it("grades a pens game on the level FT score", () => {
    expect(knockoutTipPoints(1, 1, 1, 1)).toBe(3);
    expect(knockoutTipPoints(2, 1, 1, 1)).toBe(0);
  });
  it("0 when a value is missing", () => {
    expect(knockoutTipPoints(null, null, 1, 0)).toBe(0);
  });
});

describe("tipPointsForMatch", () => {
  it("dispatches group vs knockout and ignores unfinished matches", () => {
    const grp = { stage: "group", status: "final", home_score: 2, away_score: 0 };
    expect(tipPointsForMatch(grp, { pick: "home" })).toBe(1);
    const ko = { stage: "qf", status: "final", home_score: 1, away_score: 1 };
    expect(tipPointsForMatch(ko, { pred_home: 1, pred_away: 1 })).toBe(3);
    const scheduled = { stage: "group", status: "scheduled" };
    expect(tipPointsForMatch(scheduled, { pick: "home" })).toBe(0);
  });
});

describe("tipTotal", () => {
  const matches = [
    { id: "1", stage: "group", status: "final", home_score: 2, away_score: 0 },
    { id: "2", stage: "final", status: "final", home_score: 1, away_score: 1 },
  ];
  const tips = [
    { match_id: "1", user_name: "Ozzy", pick: "home" },
    { match_id: "2", user_name: "Ozzy", pred_home: 1, pred_away: 1 },
    { match_id: "1", user_name: "Tommy", pick: "draw" },
  ];
  it("sums group + knockout tips", () => {
    expect(tipTotal("Ozzy", tips, matches)).toBe(4);
    expect(tipTotal("Tommy", tips, matches)).toBe(0);
  });
});
