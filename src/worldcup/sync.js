// src/worldcup/sync.js
// Fetches the public feed and upserts teams + matches into Supabase.
// Thin orchestration over the pure mappers in feed.js. Writes only what has
// actually changed, so a routine open costs no writes (and no realtime churn).
import { supabase } from "../supabase";
import { FEED_URL, MAIN_TEAMS, OWNERS } from "./constants";
import { mapFeedMatch, extractTeams, changedMatches } from "./feed";

const MATCH_COLS =
  "ext_key, home_team, away_team, kickoff, home_score, away_score, winner_team, status";

export async function syncWorldCup() {
  const res = await fetch(FEED_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  const json = await res.json();
  const feedMatches = json.matches || [];

  // Teams — insert only ones we don't already have. Existing rows (and their
  // owner/role) are left untouched, and we avoid firing 48 realtime events.
  const teams = extractTeams(feedMatches);
  const { data: teamRows } = await supabase.from("wc_teams").select("id, name, owner, role");
  const known = new Set((teamRows || []).map((t) => t.name));
  const freshTeams = teams.filter((t) => !known.has(t.name));
  if (freshTeams.length) {
    await supabase.from("wc_teams").upsert(freshTeams, { onConflict: "name", ignoreDuplicates: true });
  }

  // Auto-assign main teams if present and not already owned.
  for (const owner of OWNERS) {
    const t = (teamRows || []).find((x) => x.name === MAIN_TEAMS[owner]);
    if (t && !t.owner) {
      await supabase.from("wc_teams").update({ owner, role: "main" }).eq("id", t.id);
    }
  }

  // Matches — upsert only new or changed rows, so a routine open writes nothing
  // and doesn't trigger a realtime refetch storm on the other device.
  const rows = feedMatches.map(mapFeedMatch).filter(Boolean);
  const { data: existing } = await supabase.from("wc_matches").select(MATCH_COLS);
  const byKey = {};
  for (const m of existing || []) byKey[m.ext_key] = m;
  const toWrite = changedMatches(rows, byKey);
  if (toWrite.length) {
    await supabase.from("wc_matches").upsert(toWrite, { onConflict: "ext_key" });
  }

  return {
    teams: freshTeams.length,
    matches: toWrite.length,
    finished: rows.filter((r) => r.status === "final").length,
  };
}
