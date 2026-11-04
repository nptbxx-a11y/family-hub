// src/mahjong/leaderboard.js
// Pure leaderboard maths over rows from the mahjong_scores table:
// { player: "ozzy" | "tommy", mode: "quick" | "classic", seconds, assisted }.
// Best times only count clean games (no Hint/Shuffle); wins count every cleared board.

export const PLAYERS = ["ozzy", "tommy"];
export const PLAYER_NAMES = { ozzy: "Ozzy", tommy: "Tommy" };

export const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// One row per player for a mode, fastest best time first (no time sorts last).
export function summarize(scores, mode) {
  const rows = PLAYERS.map((player) => {
    const mine = scores.filter((s) => s.player === player && s.mode === mode);
    const clean = mine.filter((s) => !s.assisted).map((s) => s.seconds);
    return { player, best: clean.length ? Math.min(...clean) : null, wins: mine.length };
  });
  return rows.sort((a, b) => (a.best ?? Infinity) - (b.best ?? Infinity));
}

// The player with the strictly fastest best time, or null (no times, or a tie).
export function leaderOf(rows) {
  const [first, second] = rows;
  if (first.best === null) return null;
  if (second.best !== null && second.best === first.best) return null;
  return first.player;
}

// Would this clean time be the player's new best for the mode?
export function isPersonalBest(scores, player, mode, seconds) {
  const { best } = summarize(scores, mode).find((r) => r.player === player);
  return best === null || seconds < best;
}
