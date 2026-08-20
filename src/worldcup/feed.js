// src/worldcup/feed.js
// Pure mappers from the openfootball worldcup.json shape to our DB row shapes.
import { FAVOURITES } from "./constants.js";

// A team string like "1A", "2B", "W74", "L73" is a not-yet-decided placeholder.
export function isPlaceholderTeam(name) {
  if (!name) return true;
  if (name.includes("/")) return true; // best-third-place slots, e.g. "3A/B/C/D/F"
  if (/^\d/.test(name)) return true;    // group slots, e.g. "1A", "2B", "3C"
  return /^[WL]\d+$/.test(name) || /^RU?\d/.test(name); // "W74", "L73"
}

// Map a feed round label (+ optional group) to our stage, or null to skip.
export function roundToStage(round, group) {
  if (group) return "group";
  const r = (round || "").toLowerCase();
  if (r.startsWith("matchday") || r.includes("group")) return "group";
  if (r.includes("third") || r.includes("3rd")) return null; // skip play-off
  if (r.includes("32")) return "r32";
  if (r.includes("16")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final";
  return null;
}

// "13:00 UTC-6" + "2026-06-11" -> "2026-06-11T19:00:00.000Z", or null.
export function parseKickoff(date, time) {
  if (!date || !time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::(\d{2}))?/i);
  if (!m) return null;
  const [, hh, mm, offH, offM] = m;
  const [y, mo, d] = date.split("-").map(Number);
  const offsetHours = parseInt(offH, 10);
  const offsetMins = (offsetHours < 0 ? -1 : 1) * parseInt(offM || "0", 10);
  // UTC = local - offset
  const utc = Date.UTC(y, mo - 1, d, parseInt(hh, 10) - offsetHours, parseInt(mm, 10) - offsetMins);
  return new Date(utc).toISOString();
}

function groupCode(group) {
  return group ? group.replace(/^Group\s*/i, "").trim() : null;
}

// Map one feed match to a wc_matches row, or null if the round is skipped.
export function mapFeedMatch(m) {
  const stage = roundToStage(m.round, m.group);
  if (!stage) return null;
  const ext_key = m.num != null ? String(m.num) : `${m.date}|${m.team1}|${m.team2}`;
  const ft = m.score && m.score.ft;
  const pens = m.score && m.score.p;
  return {
    ext_key,
    stage,
    group_code: groupCode(m.group),
    home_team: m.team1,
    away_team: m.team2,
    kickoff: parseKickoff(m.date, m.time),
    home_score: ft ? ft[0] : null,
    away_score: ft ? ft[1] : null,
    winner_team: ft && pens ? (pens[0] > pens[1] ? m.team1 : m.team2) : null,
    status: ft ? "final" : "scheduled",
  };
}

// Given mapped feed rows and the existing DB rows keyed by ext_key, return only
// the rows that are new or whose result/schedule actually changed. Lets a
// routine sync write nothing when nothing has moved.
export function changedMatches(feedRows, existingByKey) {
  const PLAIN = ["home_team", "away_team", "home_score", "away_score", "winner_team", "status"];
  return feedRows.filter((r) => {
    const ex = existingByKey[r.ext_key];
    if (!ex) return true;
    if (PLAIN.some((f) => (ex[f] ?? null) !== (r[f] ?? null))) return true;
    const exK = ex.kickoff ? new Date(ex.kickoff).getTime() : null;
    const rK = r.kickoff ? new Date(r.kickoff).getTime() : null;
    return exK !== rK;
  });
}

// Collect the unique real teams across all feed matches.
export function extractTeams(matches) {
  const map = new Map();
  for (const m of matches) {
    for (const name of [m.team1, m.team2]) {
      if (isPlaceholderTeam(name) || map.has(name)) continue;
      map.set(name, {
        name,
        group_code: groupCode(m.group),
        is_favourite: FAVOURITES.includes(name),
      });
    }
  }
  return [...map.values()];
}
