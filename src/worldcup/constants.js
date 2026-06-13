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

// Tip scoring: group = simple outcome; knockout = exact-score prediction (flat).
export const GROUP_TIP = 1;
export const KO_EXACT = 3;
export const KO_RESULT = 1;

// Public data feed (keyless).
export const FEED_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

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
