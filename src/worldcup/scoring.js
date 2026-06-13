// src/worldcup/scoring.js
import { GROUP_TIP, KO_EXACT, KO_RESULT, SWEEP, DARK_HORSE_MULTIPLIER } from "./constants.js";

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

// Group tip: 1 point for the correct outcome.
export function groupTipPoints(pick, homeScore, awayScore) {
  const r = outcomeFromScore(homeScore, awayScore);
  if (!pick || !r) return 0;
  return pick === r ? GROUP_TIP : 0;
}

// Knockout tip: 3 for exact score, 1 for the right result (graded on the FT
// score — penalties are ignored), else 0.
export function knockoutTipPoints(predHome, predAway, homeScore, awayScore) {
  if (predHome == null || predAway == null || homeScore == null || awayScore == null) return 0;
  if (predHome === homeScore && predAway === awayScore) return KO_EXACT;
  const pr = outcomeFromScore(predHome, predAway);
  const ar = outcomeFromScore(homeScore, awayScore);
  return pr === ar ? KO_RESULT : 0;
}

// Points one tip earns for one match (0 unless the match is final).
export function tipPointsForMatch(match, tip) {
  if (!match || match.status !== "final" || !tip) return 0;
  if (match.stage === "group") {
    return groupTipPoints(tip.pick, match.home_score, match.away_score);
  }
  return knockoutTipPoints(tip.pred_home, tip.pred_away, match.home_score, match.away_score);
}

// Total tipping points for a user across all matches.
export function tipTotal(userName, tips, matches) {
  const byId = {};
  for (const m of matches) byId[m.id] = m;
  let pts = 0;
  for (const t of tips) {
    if (t.user_name !== userName) continue;
    pts += tipPointsForMatch(byId[t.match_id], t);
  }
  return pts;
}
