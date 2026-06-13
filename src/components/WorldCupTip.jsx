import { useState } from "react";
import { OWNERS, STAGE_LABELS } from "../worldcup/constants";
import { upsertTip } from "../worldcup/db";
import { tipPointsForMatch } from "../worldcup/scoring";
import { isPlaceholderTeam } from "../worldcup/feed";
import { flagFor } from "../worldcup/flags";

function ordinal(n) {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

// "Sat 13th June · 20:00" in the viewer's local time, or a fallback.
function formatMatchDate(iso) {
  if (!iso) return "Date TBC";
  const d = new Date(iso);
  const wd = d.toLocaleDateString("en-GB", { weekday: "short" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${wd} ${d.getDate()}${ordinal(d.getDate())} ${month} · ${time}`;
}

function matchStarted(m) {
  if (m.status === "final") return true;
  return m.kickoff ? new Date(m.kickoff) <= new Date() : false;
}

// Read-only label for a committed tip.
function committedLabel(m, tip, isGroup, fHome, fAway) {
  if (!tip || (isGroup ? !tip.pick : tip.pred_home == null)) return "No pick made";
  if (isGroup) {
    if (tip.pick === "draw") return "Draw";
    return tip.pick === "home"
      ? `${fHome} ${m.home_team} win`
      : `${fAway} ${m.away_team} win`;
  }
  return `${fHome} ${tip.pred_home}–${tip.pred_away} ${fAway}`;
}

export default function WorldCupTip({ data }) {
  const { matches, tips } = data;
  // Local pending knockout score edits, keyed `${matchId}:${user}`.
  const [draftScores, setDraftScores] = useState({});

  const tipFor = (matchId, user) =>
    tips.find((t) => t.match_id === matchId && t.user_name === user);

  async function pickOutcome(match, user, value) {
    await upsertTip(match.id, user, { pick: value });
  }
  async function lockOutcome(match, user) {
    await upsertTip(match.id, user, { locked: true });
  }
  async function lockScore(match, user, home, away) {
    await upsertTip(match.id, user, {
      pred_home: parseInt(home, 10),
      pred_away: parseInt(away, 10),
      locked: true,
    });
  }

  // Only matches with two real teams are shown.
  const visible = matches.filter(
    (m) => !isPlaceholderTeam(m.home_team) && !isPlaceholderTeam(m.away_team)
  );

  if (visible.length === 0) {
    return <div className="wc-empty">No fixtures yet — tap 🔄 Refresh, or check back once the schedule loads.</div>;
  }

  return (
    <div className="wc-tip-list">
      {visible.map((m) => {
        const started = matchStarted(m);
        const isFinal = m.status === "final";
        const isGroup = m.stage === "group";
        const fHome = flagFor(m.home_team);
        const fAway = flagFor(m.away_team);

        return (
          <div key={m.id} className="wc-card wc-match">
            <div className="wc-match-top">
              <span className="wc-stage">{STAGE_LABELS[m.stage]}</span>
              <span className="wc-date">{formatMatchDate(m.kickoff)}</span>
            </div>
            <div className="wc-teams-row">
              <span>{fHome} {m.home_team}</span>
              <span className="wc-vs">v</span>
              <span>{m.away_team} {fAway}</span>
            </div>
            {isFinal && (
              <div className="wc-final-score">
                Full time {m.home_score}–{m.away_score}
                {m.winner_team ? ` · ${m.winner_team} won on pens` : ""}
              </div>
            )}

            {OWNERS.map((user) => {
              const tip = tipFor(m.id, user);
              const committed = !!tip?.locked || started;
              const pts = isFinal ? tipPointsForMatch(m, tip) : null;
              const key = `${m.id}:${user}`;
              const draft = draftScores[key] || {};
              const homeVal = draft.home != null ? draft.home : (tip?.pred_home != null ? String(tip.pred_home) : "");
              const awayVal = draft.away != null ? draft.away : (tip?.pred_away != null ? String(tip.pred_away) : "");
              const canLockScore =
                homeVal !== "" && awayVal !== "" &&
                !Number.isNaN(parseInt(homeVal, 10)) && !Number.isNaN(parseInt(awayVal, 10));

              return (
                <div key={user} className="wc-pick-row">
                  <span className="wc-pick-user">{user}</span>

                  {committed ? (
                    <span className="wc-committed">
                      {committedLabel(m, tip, isGroup, fHome, fAway)}
                      {tip?.locked && !isFinal && <span className="wc-lockicon"> 🔒</span>}
                      {isFinal && tip && (
                        <span className={"wc-tick" + (pts > 0 ? " ok" : " no")}> {pts > 0 ? `+${pts}` : "✗"}</span>
                      )}
                    </span>
                  ) : isGroup ? (
                    <div className="wc-pick-col">
                      <div className="wc-pick-btns-col">
                        <button className={"wc-pick" + (tip?.pick === "home" ? " chosen" : "")} onClick={() => pickOutcome(m, user, "home")}>{fHome} {m.home_team} win</button>
                        <button className={"wc-pick" + (tip?.pick === "draw" ? " chosen" : "")} onClick={() => pickOutcome(m, user, "draw")}>Draw</button>
                        <button className={"wc-pick" + (tip?.pick === "away" ? " chosen" : "")} onClick={() => pickOutcome(m, user, "away")}>{fAway} {m.away_team} win</button>
                      </div>
                      <button className="wc-lockin" disabled={!tip?.pick} onClick={() => lockOutcome(m, user)}>🔒 Lock in</button>
                    </div>
                  ) : (
                    <div className="wc-pick-col">
                      <div className="wc-score-entry">
                        <span className="wc-se-team">{fHome}</span>
                        <input
                          type="number" min="0" inputMode="numeric"
                          aria-label={`${user} ${m.home_team} score`}
                          defaultValue={tip?.pred_home ?? ""}
                          onChange={(e) => setDraftScores((s) => ({ ...s, [key]: { ...s[key], home: e.target.value } }))}
                        />
                        <span className="wc-vs">–</span>
                        <input
                          type="number" min="0" inputMode="numeric"
                          aria-label={`${user} ${m.away_team} score`}
                          defaultValue={tip?.pred_away ?? ""}
                          onChange={(e) => setDraftScores((s) => ({ ...s, [key]: { ...s[key], away: e.target.value } }))}
                        />
                        <span className="wc-se-team">{fAway}</span>
                      </div>
                      <button className="wc-lockin" disabled={!canLockScore} onClick={() => lockScore(m, user, homeVal, awayVal)}>🔒 Lock in</button>
                    </div>
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
