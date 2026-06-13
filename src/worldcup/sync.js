// src/worldcup/sync.js
// Fetches the public feed and upserts teams + matches into Supabase.
// Thin orchestration over the pure mappers in feed.js.
import { supabase } from "../supabase";
import { FEED_URL, MAIN_TEAMS, OWNERS } from "./constants";
import { mapFeedMatch, extractTeams } from "./feed";

export async function syncWorldCup() {
  const res = await fetch(FEED_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  const json = await res.json();
  const feedMatches = json.matches || [];

  const teams = extractTeams(feedMatches);
  if (teams.length) {
    await supabase.from("wc_teams").upsert(teams, { onConflict: "name" });
  }

  const { data: teamRows } = await supabase
    .from("wc_teams")
    .select("id, name, owner, role");
  for (const owner of OWNERS) {
    const t = (teamRows || []).find((x) => x.name === MAIN_TEAMS[owner]);
    if (t && !t.owner) {
      await supabase.from("wc_teams").update({ owner, role: "main" }).eq("id", t.id);
    }
  }

  const rows = feedMatches.map(mapFeedMatch).filter(Boolean);
  if (rows.length) {
    await supabase.from("wc_matches").upsert(rows, { onConflict: "ext_key" });
  }

  const finished = rows.filter((r) => r.status === "final").length;
  return { teams: teams.length, matches: rows.length, finished };
}
