import { useState } from "react";
import { PLAYER_NAMES, formatTime, leaderOf, summarize } from "../mahjong/leaderboard";

const MODES = [["quick", "Quick"], ["classic", "Classic"]];

// Ozzy vs Tommy best times for one board size at a time.
export default function MahjongLeaderboard({ scores, error }) {
  const [mode, setMode] = useState("quick");
  const rows = summarize(scores, mode);
  const leader = leaderOf(rows);

  return (
    <section className="mj-lb" aria-label="Leaderboard">
      <div className="mj-lb-tabs" role="tablist">
        {MODES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className={"mj-lb-tab" + (mode === key ? " active" : "")}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mj-lb-error">Couldn't load the leaderboard — check your connection.</p>
      ) : (
        rows.map((r) => {
          const medal = r.best === null ? "⏳" : r.player === leader ? "🥇" : leader ? "🥈" : "🤝";
          return (
            <div key={r.player} className={"mj-lb-row" + (r.player === leader ? " leading" : "")}>
              <span className="mj-lb-medal" aria-hidden="true">{medal}</span>
              <span className="mj-lb-name">{PLAYER_NAMES[r.player]}</span>
              <span className="mj-lb-time">{r.best === null ? "—" : formatTime(r.best)}</span>
              <span className="mj-lb-sub">
                {r.wins} {r.wins === 1 ? "board" : "boards"} cleared
                {r.best === null && r.wins > 0 ? " · no clean game yet" : ""}
              </span>
            </div>
          );
        })
      )}
      <p className="mj-lb-note">Best times only count games with no Hint or Shuffle.</p>
    </section>
  );
}
