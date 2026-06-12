// src/worldcup/scoring.js
import { TIP_POINTS, SWEEP, DARK_HORSE_MULTIPLIER } from "./constants.js";

// "home" | "away" | "draw" | null
export function outcomeFromScore(homeScore, awayScore) {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

// The team name that won, or null if not final / a true draw.
export function matchWinner(match) {
  if (!match || match.status !== "final") return null;
  if (match.winner_team) return match.winner_team;
  const r = outcomeFromScore(match.home_score, match.away_score);
  if (r === "home") return match.home_team;
  if (r === "away") return match.away_team;
  return null;
}

// The outcome a tip is graded against: groups use raw score; knockouts use
// the decisive winner (penalties resolved), mapped back to home/away.
export function resultForTip(match) {
  if (!match || match.status !== "final") return null;
  if (match.stage === "group") {
    return outcomeFromScore(match.home_score, match.away_score);
  }
  const w = matchWinner(match);
  if (!w) return outcomeFromScore(match.home_score, match.away_score);
  return w === match.home_team ? "home" : "away";
}

// Points a single tip earns.
export function tipPoints(stage, pick, result) {
  if (!pick || !result || pick !== result) return 0;
  return TIP_POINTS[stage] ?? 0;
}

// Bonus for an owned team in one finished GROUP match.
export function groupMatchBonus(teamName, match) {
  if (!match || match.stage !== "group" || match.status !== "final") return 0;
  const isHome = match.home_team === teamName;
  const isAway = match.away_team === teamName;
  if (!isHome && !isAway) return 0;
  const result = outcomeFromScore(match.home_score, match.away_score);
  if (result === "draw") return SWEEP.groupDraw;
  if ((isHome && result === "home") || (isAway && result === "away")) return SWEEP.groupWin;
  return 0;
}

// True if the team appears in any knockout-stage fixture (scheduled or final).
export function reachedKnockouts(teamName, matches) {
  return matches.some(
    (m) => m.stage !== "group" && (m.home_team === teamName || m.away_team === teamName)
  );
}

// Total sweepstakes points for one owned team. role: "main" | "darkhorse".
export function sweepstakesPoints(teamName, role, matches) {
  let pts = 0;
  for (const m of matches) pts += groupMatchBonus(teamName, m);
  if (reachedKnockouts(teamName, matches)) pts += SWEEP.reachKnockouts;
  for (const m of matches) {
    if (m.stage !== "group" && m.status === "final" && matchWinner(m) === teamName) {
      pts += SWEEP.knockoutRoundWin;
    }
  }
  // Winning the final stacks: the final is itself a knockout round (so it earns
  // knockoutRoundWin above) AND this tournament-win bonus. Intentional — lifting
  // the cup is the jackpot (doubled again for a dark horse).
  const finalMatch = matches.find((m) => m.stage === "final" && m.status === "final");
  if (finalMatch && matchWinner(finalMatch) === teamName) pts += SWEEP.winTournament;

  const mult = role === "darkhorse" ? DARK_HORSE_MULTIPLIER : 1;
  return pts * mult;
}

// Total tipping points for a user across all finished matches.
export function tipTotal(userName, tips, matches) {
  const byId = {};
  for (const m of matches) byId[m.id] = m;
  let pts = 0;
  for (const t of tips) {
    if (t.user_name !== userName) continue;
    const m = byId[t.match_id];
    if (!m || m.status !== "final") continue;
    pts += tipPoints(m.stage, t.pick, resultForTip(m));
  }
  return pts;
}
