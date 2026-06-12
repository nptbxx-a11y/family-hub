import { useState } from "react";
import { OWNERS, STAGE_LABELS } from "../worldcup/constants";
import { upsertTip, saveResult } from "../worldcup/db";
import { resultForTip } from "../worldcup/scoring";

function pickOptions(stage) {
  return stage === "group"
    ? [["home", "Home"], ["draw", "Draw"], ["away", "Away"]]
    : [["home", "Home"], ["away", "Away"]];
}

export default function WorldCupTip({ data }) {
  const { matches, tips } = data;
  const [resultFor, setResultFor] = useState(null);
  const [scores, setScores] = useState({ home: "", away: "", winner: "" });

  const tipFor = (matchId, user) =>
    tips.find((t) => t.match_id === matchId && t.user_name === user)?.pick;

  async function pick(match, user, value) {
    await upsertTip(match.id, user, value);
  }

  async function submitResult(match) {
    const home = parseInt(scores.home, 10);
    const away = parseInt(scores.away, 10);
    if (Number.isNaN(home) || Number.isNaN(away)) return;
    const fields = { home_score: home, away_score: away, status: "final" };
    if (match.stage !== "group" && home === away) {
      if (!scores.winner) { alert("Pick who advanced (penalties)."); return; }
      fields.winner_team = scores.winner;
    }
    await saveResult(match.id, fields);
    setResultFor(null);
    setScores({ home: "", away: "", winner: "" });
  }

  if (matches.length === 0) {
    return <div className="wc-empty">No matches yet — add fixtures with the ⚙️ Setup button.</div>;
  }

  return (
    <div className="wc-tip-list">
      {matches.map((m) => {
        const isFinal = m.status === "final";
        const graded = isFinal ? resultForTip(m) : null;
        return (
          <div key={m.id} className="wc-card wc-match">
            <div className="wc-match-top">
              <span className="wc-stage">{STAGE_LABELS[m.stage]}</span>
              {isFinal && (
                <span className="wc-score">
                  {m.home_score}–{m.away_score}
                  {m.winner_team ? ` (${m.winner_team})` : ""}
                </span>
              )}
            </div>
            <div className="wc-teams-row">
              <span>{m.home_team}</span>
              <span className="wc-vs">v</span>
              <span>{m.away_team}</span>
            </div>

            {OWNERS.map((user) => {
              const myPick = tipFor(m.id, user);
              const correct = isFinal && myPick && myPick === graded;
              return (
                <div key={user} className="wc-pick-row">
                  <span className="wc-pick-user">{user}</span>
                  <div className="wc-pick-btns">
                    {pickOptions(m.stage).map(([val, label]) => (
                      <button
                        key={val}
                        disabled={isFinal}
                        className={"wc-pick" + (myPick === val ? " chosen" : "")}
                        onClick={() => pick(m, user, val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {isFinal && myPick && (
                    <span className={"wc-tick" + (correct ? " ok" : " no")}>{correct ? "✓" : "✗"}</span>
                  )}
                </div>
              );
            })}

            {!isFinal && (
              resultFor === m.id ? (
                <div className="wc-result-entry">
                  <input type="number" min="0" placeholder="H" value={scores.home}
                    onChange={(e) => setScores((s) => ({ ...s, home: e.target.value }))} />
                  <input type="number" min="0" placeholder="A" value={scores.away}
                    onChange={(e) => setScores((s) => ({ ...s, away: e.target.value }))} />
                  {m.stage !== "group" && scores.home !== "" && scores.home === scores.away && (
                    <select value={scores.winner} onChange={(e) => setScores((s) => ({ ...s, winner: e.target.value }))}>
                      <option value="">Won on pens…</option>
                      <option value={m.home_team}>{m.home_team}</option>
                      <option value={m.away_team}>{m.away_team}</option>
                    </select>
                  )}
                  <button onClick={() => submitResult(m)}>Save</button>
                  <button onClick={() => setResultFor(null)}>✕</button>
                </div>
              ) : (
                <button className="wc-enter-result" onClick={() => { setResultFor(m.id); setScores({ home: "", away: "", winner: "" }); }}>
                  Enter result
                </button>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
