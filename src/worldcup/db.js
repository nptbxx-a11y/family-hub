// src/worldcup/db.js
import { supabase } from "../supabase";

export async function fetchAll() {
  const [teamsRes, matchesRes, tipsRes] = await Promise.all([
    supabase.from("wc_teams").select("*").order("name"),
    supabase.from("wc_matches").select("*").order("kickoff", { nullsFirst: false }),
    supabase.from("wc_tips").select("*"),
  ]);
  // Returning empty arrays on failure matches the rest of the app's fetch
  // pattern; we still surface the error to the console for debugging.
  for (const res of [teamsRes, matchesRes, tipsRes]) {
    if (res.error) console.warn("World Cup fetch error:", res.error.message);
  }
  return {
    teams: teamsRes.data || [],
    matches: matchesRes.data || [],
    tips: tipsRes.data || [],
  };
}

// fields: { pick } for a group tip, or { pred_home, pred_away } for a knockout tip
export async function upsertTip(matchId, userName, fields) {
  return supabase
    .from("wc_tips")
    .upsert(
      { match_id: matchId, user_name: userName, ...fields },
      { onConflict: "match_id,user_name" }
    );
}

export async function setTeamOwner(id, owner, role) {
  return supabase.from("wc_teams").update({ owner, role }).eq("id", id);
}

export async function clearOwners() {
  return supabase.from("wc_teams").update({ owner: null, role: null }).not("id", "is", null);
}
