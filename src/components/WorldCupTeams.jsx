import { OWNERS } from "../worldcup/constants";
import { sweepstakesPoints, reachedKnockouts, matchWinner } from "../worldcup/scoring";

function teamStatus(name, matches) {
  if (reachedKnockouts(name, matches)) {
    const lost = matches.some(
      (m) => m.stage !== "group" && m.status === "final" &&
        (m.home_team === name || m.away_team === name) && matchWinner(m) !== name
    );
    return lost ? "Knocked out" : "Still in 🟢";
  }
  return "Group stage";
}

export default function WorldCupTeams({ data }) {
  const { teams, matches } = data;

  return (
    <div>
      {OWNERS.map((user) => {
        const owned = teams.filter((t) => t.owner === user);
        const total = owned.reduce((s, t) => s + sweepstakesPoints(t.name, t.role, matches), 0);
        return (
          <div key={user} className="wc-card wc-team-card">
            <div className="wc-team-head">
              <span className="wc-leader-name">{user}</span>
              <span className="wc-leader-total">{total}</span>
            </div>
            {owned.length === 0 && <p className="wc-muted">No teams yet — run the draw in ⚙️ Setup.</p>}
            {owned.map((t) => (
              <div key={t.id} className="wc-team-row">
                <span className="wc-team-name">{t.name}</span>
                <span className={"wc-role wc-role-" + t.role}>{t.role === "darkhorse" ? "🐎 dark horse ×2" : "⭐ main"}</span>
                <span className="wc-team-pts">{sweepstakesPoints(t.name, t.role, matches)} pts</span>
                <span className="wc-team-status">{teamStatus(t.name, matches)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
