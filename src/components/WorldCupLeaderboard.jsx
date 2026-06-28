import { standings } from "../worldcup/scoring";

export default function WorldCupLeaderboard({ data }) {
  const rows = standings(data);
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
      {rows.map((r, i) => {
        const isLeading = i === 0 && r.total > 0 && !tied;
        return (
          <div key={r.user} className={"wc-card wc-leader-row" + (isLeading ? " leading" : "")}>
            <span className="wc-leader-rank" aria-hidden="true">{i === 0 ? "🥇" : "🥈"}</span>
            <span className="wc-leader-name">{r.user}</span>
            <span className="wc-leader-total">{r.total}</span>
            <span className="wc-leader-breakdown">
              tips {r.tipPts} · teams {r.sweepPts}
            </span>
          </div>
        );
      })}
    </div>
  );
}
