import { useState } from "react";
import { OWNERS, STAGE_LABELS } from "../worldcup/constants";
import { upsertTip } from "../worldcup/db";
import { tipPointsForMatch } from "../worldcup/scoring";
import { isPlaceholderTeam } from "../worldcup/feed";

function isLocked(m) {
  if (m.status === "final") return true;
  return m.kickoff ? new Date(m.kickoff) <= new Date() : false;
}

export default function WorldCupTip({ data }) {
  const { matches, tips } = data;
  // Local pending scores for knockout inputs, keyed `${matchId}:${user}`.
  const [draftScores, setDraftScores] = useState({});

  const tipFor = (matchId, user) =>
    tips.find((t) => t.match_id === matchId && t.user_name === user);

  async function pickOutcome(match, user, value) {
    await upsertTip(match.id, user, { pick: value });
  }

  async function saveScore(match, user) {
    const key = `${match.id}:${user}`;
    const d = draftScores[key] || {};
    const h = parseInt(d.home, 10);
    const a = parseInt(d.away, 10);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    await upsertTip(match.id, user, { pred_home: h, pred_away: a });
  }

  // Only matches with two real teams are tippable / shown.
  const visible = matches.filter(
    (m) => !isPlaceholderTeam(m.home_team) && !isPlaceholderTeam(m.away_team)
  );

  if (visible.length === 0) {
    return <div className="wc-empty">No fixtures yet — tap 🔄 Refresh, or check back once the schedule loads.</div>;
  }

  return (
    <div className="wc-tip-list">
      {visible.map((m) => {
        const locked = isLocked(m);
        const isFinal = m.status === "final";
        const isGroup = m.stage === "group";
        return (
          <div key={m.id} className="wc-card wc-match">
            <div className="wc-match-top">
              <span className="wc-stage">{STAGE_LABELS[m.stage]}</span>
              {isFinal && (
                <span className="wc-score">{m.home_score}–{m.away_score}{m.winner_team ? ` (${m.winner_team} pens)` : ""}</span>
              )}
            </div>
            <div className="wc-teams-row">
              <span>{m.home_team}</span>
              <span className="wc-vs">v</span>
              <span>{m.away_team}</span>
            </div>

            {OWNERS.map((user) => {
              const tip = tipFor(m.id, user);
              const pts = isFinal ? tipPointsForMatch(m, tip) : null;
              const key = `${m.id}:${user}`;
              return (
                <div key={user} className="wc-pick-row">
                  <span className="wc-pick-user">{user}</span>

                  {isGroup ? (
                    <div className="wc-pick-btns">
                      {[["home", "Home"], ["draw", "Draw"], ["away", "Away"]].map(([val, label]) => (
                        <button
                          key={val}
                          disabled={locked}
                          className={"wc-pick" + (tip?.pick === val ? " chosen" : "")}
                          onClick={() => pickOutcome(m, user, val)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="wc-score-entry">
                      <input
                        type="number" min="0" inputMode="numeric"
                        aria-label={`${user} ${m.home_team} score`}
                        disabled={locked}
                        defaultValue={tip?.pred_home ?? ""}
                        onChange={(e) => setDraftScores((s) => ({ ...s, [key]: { ...s[key], home: e.target.value } }))}
                        onBlur={() => saveScore(m, user)}
                      />
                      <span className="wc-vs">–</span>
                      <input
                        type="number" min="0" inputMode="numeric"
                        aria-label={`${user} ${m.away_team} score`}
                        disabled={locked}
                        defaultValue={tip?.pred_away ?? ""}
                        onChange={(e) => setDraftScores((s) => ({ ...s, [key]: { ...s[key], away: e.target.value } }))}
                        onBlur={() => saveScore(m, user)}
                      />
                      {!isFinal && tip && tip.pred_home != null && (
                        <span className="wc-saved">saved {tip.pred_home}–{tip.pred_away}</span>
                      )}
                    </div>
                  )}

                  {isFinal && tip && (
                    <span className={"wc-tick" + (pts > 0 ? " ok" : " no")}>
                      {pts > 0 ? `+${pts}` : "✗"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
