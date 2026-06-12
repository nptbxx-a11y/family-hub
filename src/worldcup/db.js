// src/worldcup/db.js
import { supabase } from "../supabase";

export async function fetchAll() {
  const [{ data: teams }, { data: matches }, { data: tips }] = await Promise.all([
    supabase.from("wc_teams").select("*").order("name"),
    supabase.from("wc_matches").select("*").order("kickoff", { nullsFirst: false }),
    supabase.from("wc_tips").select("*"),
  ]);
  return { teams: teams || [], matches: matches || [], tips: tips || [] };
}

export async function upsertTip(matchId, userName, pick) {
  return supabase
    .from("wc_tips")
    .upsert({ match_id: matchId, user_name: userName, pick }, { onConflict: "match_id,user_name" });
}

export async function saveResult(matchId, fields) {
  // fields: { home_score, away_score, winner_team?, status: "final" }
  return supabase.from("wc_matches").update(fields).eq("id", matchId);
}

export async function addTeam(team) {
  return supabase.from("wc_teams").insert(team);
}

export async function addMatch(match) {
  return supabase.from("wc_matches").insert(match);
}

export async function setTeamOwner(id, owner, role) {
  return supabase.from("wc_teams").update({ owner, role }).eq("id", id);
}

export async function clearOwners() {
  return supabase.from("wc_teams").update({ owner: null, role: null }).not("id", "is", null);
}
