// src/worldcup/feed.test.js
import { describe, it, expect } from "vitest";
import {
  isPlaceholderTeam,
  roundToStage,
  parseKickoff,
  mapFeedMatch,
  extractTeams,
} from "./feed.js";

describe("isPlaceholderTeam", () => {
  it("flags group/winner placeholders", () => {
    expect(isPlaceholderTeam("1A")).toBe(true);
    expect(isPlaceholderTeam("2B")).toBe(true);
    expect(isPlaceholderTeam("W74")).toBe(true);
    expect(isPlaceholderTeam("L73")).toBe(true);
    expect(isPlaceholderTeam(undefined)).toBe(true);
  });
  it("accepts real country names", () => {
    expect(isPlaceholderTeam("England")).toBe(false);
    expect(isPlaceholderTeam("South Africa")).toBe(false);
  });
});

describe("roundToStage", () => {
  it("maps group games", () => {
    expect(roundToStage("Matchday 1", "Group A")).toBe("group");
    expect(roundToStage("Matchday 3", "Group L")).toBe("group");
  });
  it("maps knockout rounds", () => {
    expect(roundToStage("Round of 32")).toBe("r32");
    expect(roundToStage("Round of 16")).toBe("r16");
    expect(roundToStage("Quarter-finals")).toBe("qf");
    expect(roundToStage("Semi-finals")).toBe("sf");
    expect(roundToStage("Final")).toBe("final");
  });
  it("skips the third-place play-off", () => {
    expect(roundToStage("Match for third place")).toBe(null);
  });
});

describe("parseKickoff", () => {
  it("converts local-with-offset to a UTC ISO string", () => {
    expect(parseKickoff("2026-06-11", "13:00 UTC-6")).toBe("2026-06-11T19:00:00.000Z");
  });
  it("returns null when time is missing", () => {
    expect(parseKickoff("2026-06-11", undefined)).toBe(null);
  });
});

describe("mapFeedMatch", () => {
  it("maps a finished group match", () => {
    const row = mapFeedMatch({
      round: "Matchday 1", date: "2026-06-11", time: "13:00 UTC-6",
      team1: "Mexico", team2: "South Africa", group: "Group A",
      score: { ft: [2, 0], ht: [1, 0] },
    });
    expect(row).toMatchObject({
      ext_key: "2026-06-11|Mexico|South Africa",
      stage: "group", group_code: "A",
      home_team: "Mexico", away_team: "South Africa",
      home_score: 2, away_score: 0, status: "final",
    });
  });
  it("maps an unplayed knockout with num as ext_key and scheduled status", () => {
    const row = mapFeedMatch({
      round: "Round of 32", num: 73, date: "2026-06-28", time: "12:00 UTC-7",
      team1: "1A", team2: "3C",
    });
    expect(row).toMatchObject({ ext_key: "73", stage: "r32", status: "scheduled", home_score: null });
  });
  it("returns null for skipped rounds", () => {
    expect(mapFeedMatch({ round: "Match for third place", date: "x", team1: "A", team2: "B" })).toBe(null);
  });
  it("sets winner_team from a penalty score", () => {
    const row = mapFeedMatch({
      round: "Final", num: 104, date: "2026-07-19", time: "15:00 UTC-4",
      team1: "Brazil", team2: "France", score: { ft: [1, 1], p: [4, 2] },
    });
    expect(row.winner_team).toBe("Brazil");
  });
});

describe("extractTeams", () => {
  it("collects real teams, tags favourites, skips placeholders", () => {
    const teams = extractTeams([
      { team1: "England", team2: "Wales", group: "Group A" },
      { team1: "1A", team2: "2B" },
    ]);
    const byName = Object.fromEntries(teams.map((t) => [t.name, t]));
    expect(Object.keys(byName).sort()).toEqual(["England", "Wales"]);
    expect(byName.England.is_favourite).toBe(true);
    expect(byName.Wales.is_favourite).toBe(false);
    expect(byName.England.group_code).toBe("A");
  });
});
