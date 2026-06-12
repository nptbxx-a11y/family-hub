// src/worldcup/constants.js
// Single source of truth for all tunable World Cup game config.

export const OWNERS = ["Ozzy", "Tommy"];

// Each owner's self-chosen main team.
export const MAIN_TEAMS = { Ozzy: "Australia", Tommy: "England" };

// Tournament stages in order.
export const STAGES = ["group", "r32", "r16", "qf", "sf", "final"];

export const STAGE_LABELS = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  final: "Final",
};

// Points for a CORRECT outcome tip, per stage (escalates in the knockouts).
export const TIP_POINTS = {
  group: 1,
  r32: 2,
  r16: 3,
  qf: 5,
  sf: 8,
  final: 13,
};

// Sweepstakes bonuses for an OWNED team.
export const SWEEP = {
  groupWin: 2,
  groupDraw: 1,
  reachKnockouts: 5,
  knockoutRoundWin: 5,
  winTournament: 25,
};

// Dark-horse teams score double on all sweepstakes bonuses.
export const DARK_HORSE_MULTIPLIER = 2;

// Tournament favourites — excluded from the dark-horse draw pool.
export const FAVOURITES = [
  "Spain",
  "France",
  "Argentina",
  "Brazil",
  "Portugal",
  "Germany",
  "Netherlands",
  "England",
];
