import { currentRound } from "../worldcup/phase";

const ROUNDS = [
  { key: "r32", label: "R32" },
  { key: "r16", label: "R16" },
  { key: "qf", label: "QF" },
  { key: "sf", label: "SF" },
  { key: "final", label: "🏆 Final" },
];

// Compact "road to the final" progress strip with the current round lit up.
export default function WorldCupBracketStrip({ matches }) {
  const cur = currentRound(matches);
  return (
    <div className="wc-bracket" aria-label="Knockout progress">
      {ROUNDS.map((r, i) => (
        <span key={r.key} className="wc-bracket-seg">
          <span className={"wc-bracket-round" + (cur === r.key ? " current" : "")}>{r.label}</span>
          {i < ROUNDS.length - 1 && <span className="wc-bracket-arrow" aria-hidden="true">›</span>}
        </span>
      ))}
    </div>
  );
}
