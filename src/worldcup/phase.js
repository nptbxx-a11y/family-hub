// src/worldcup/phase.js
// Pure helpers describing where the tournament is up to.

const KO_ORDER = ["r32", "r16", "qf", "sf", "final"];

// The earliest stage that still has an unplayed match: "group" or a KO stage.
// If everything is final, returns "final".
export function currentRound(matches) {
  for (const stage of ["group", ...KO_ORDER]) {
    if (matches.some((m) => m.stage === stage && m.status !== "final")) return stage;
  }
  return "final";
}

// A short phase label for the hero subtitle.
export function phaseLabel(matches) {
  if (!matches || matches.length === 0) return "Pick the winners";
  const finalDone = matches.some((m) => m.stage === "final" && m.status === "final");
  if (finalDone) return "Champions crowned 🏆";
  const r = currentRound(matches);
  if (r === "group") return "Group stage · pick the winners";
  if (r === "final") return "The final · road's end";
  return "Knockout stage · road to the final";
}
