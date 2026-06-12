import { OWNERS } from "../worldcup/constants";
import { tipTotal, sweepstakesPoints } from "../worldcup/scoring";

export default function WorldCupLeaderboard({ data }) {
  const { teams, matches, tips } = data;

  const rows = OWNERS.map((user) => {
    const tipPts = tipTotal(user, tips, matches);
    const owned = teams.filter((t) => t.owner === user);
    const sweepPts = owned.reduce(
      (sum, t) => sum + sweepstakesPoints(t.name, t.role, matches),
      0
    );
    return { user, tipPts, sweepPts, total: tipPts + sweepPts };
  }).sort((a, b) => b.total - a.total);

  const leader = rows[0];
  const tied = rows.length > 1 && rows[0].total === rows[1].total;

  return (
    <div>
      <div className="wc-leader-banner">
        {leader.total === 0
          ? "No points yet — get tipping!"
          : tied
          ? `It's a tie on ${leader.total}!`
          : `${leader.user} leads with ${leader.total} 🏆`}
      </div>
      {rows.map((r) => (
        <div key={r.user} className="wc-card wc-leader-row">
          <span className="wc-leader-name">{r.user}</span>
          <span className="wc-leader-total">{r.total}</span>
          <span className="wc-leader-breakdown">
            tips {r.tipPts} · teams {r.sweepPts}
          </span>
        </div>
      ))}
    </div>
  );
}
