import { getServerSupabase, isServerSupabaseConfigured } from "@/lib/supabase/server";
import type { Team } from "@/types/team";
import type { Player } from "@/types/player";
import type { Match, MatchWithTeams, Standing, StandingWithTeam } from "@/types/match";
import { isLiveStatus, isFinishedStatus } from "@/types/match";

// All reads go through the service-role client (server-only). Pages that use
// these are Server Components, so keys never reach the browser.

export function isConfigured(): boolean {
  return isServerSupabaseConfigured();
}

export async function getAllTeams(): Promise<Team[]> {
  if (!isServerSupabaseConfigured()) return [];
  const db = getServerSupabase();
  const { data } = await db.from("teams").select("*").order("group_code").order("name");
  return (data as Team[]) ?? [];
}

export async function getTeam(id: number): Promise<Team | null> {
  if (!isServerSupabaseConfigured()) return null;
  const db = getServerSupabase();
  const { data } = await db.from("teams").select("*").eq("id", id).maybeSingle();
  return (data as Team) ?? null;
}

export async function getTeamsByGroup(): Promise<Map<string, Team[]>> {
  const teams = await getAllTeams();
  const map = new Map<string, Team[]>();
  for (const t of teams) {
    const key = t.group_code ?? "?";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}

export async function getSquad(teamId: number): Promise<Player[]> {
  if (!isServerSupabaseConfigured()) return [];
  const db = getServerSupabase();
  const { data } = await db
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("jersey_number", { nullsFirst: false });
  return (data as Player[]) ?? [];
}

export async function getPlayer(id: number): Promise<Player | null> {
  if (!isServerSupabaseConfigured()) return null;
  const db = getServerSupabase();
  const { data } = await db.from("players").select("*").eq("id", id).maybeSingle();
  return (data as Player) ?? null;
}

async function teamMap(): Promise<Map<number, Team>> {
  const teams = await getAllTeams();
  return new Map(teams.map((t) => [t.id, t]));
}

function attachTeams(matches: Match[], teams: Map<number, Team>): MatchWithTeams[] {
  return matches.map((m) => ({
    ...m,
    home_team: m.home_team_id ? teams.get(m.home_team_id) ?? null : null,
    away_team: m.away_team_id ? teams.get(m.away_team_id) ?? null : null,
  }));
}

export async function getAllMatches(): Promise<MatchWithTeams[]> {
  if (!isServerSupabaseConfigured()) return [];
  const db = getServerSupabase();
  const { data } = await db.from("matches").select("*").order("kickoff_utc");
  return attachTeams((data as Match[]) ?? [], await teamMap());
}

export async function getMatch(id: number): Promise<MatchWithTeams | null> {
  if (!isServerSupabaseConfigured()) return null;
  const db = getServerSupabase();
  const { data } = await db.from("matches").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const teams = await teamMap();
  return attachTeams([data as Match], teams)[0];
}

export async function getMatchesForTeam(teamId: number): Promise<MatchWithTeams[]> {
  if (!isServerSupabaseConfigured()) return [];
  const db = getServerSupabase();
  const { data } = await db
    .from("matches")
    .select("*")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("kickoff_utc");
  return attachTeams((data as Match[]) ?? [], await teamMap());
}

export async function getMatchesForVenue(venueName: string): Promise<MatchWithTeams[]> {
  if (!isServerSupabaseConfigured()) return [];
  const db = getServerSupabase();
  const { data } = await db
    .from("matches")
    .select("*")
    .eq("venue", venueName)
    .order("kickoff_utc");
  return attachTeams((data as Match[]) ?? [], await teamMap());
}

export async function getUpcomingMatches(limit = 5): Promise<MatchWithTeams[]> {
  if (!isServerSupabaseConfigured()) return [];
  const db = getServerSupabase();
  const { data } = await db
    .from("matches")
    .select("*")
    .eq("status", "NS")
    .order("kickoff_utc")
    .limit(limit);
  return attachTeams((data as Match[]) ?? [], await teamMap());
}

export async function getRecentResults(limit = 5): Promise<MatchWithTeams[]> {
  if (!isServerSupabaseConfigured()) return [];
  const db = getServerSupabase();
  const { data } = await db
    .from("matches")
    .select("*")
    .in("status", ["FT", "AET", "PEN"])
    .order("kickoff_utc", { ascending: false })
    .limit(limit);
  return attachTeams((data as Match[]) ?? [], await teamMap());
}

export async function getLiveMatches(): Promise<MatchWithTeams[]> {
  const all = await getAllMatches();
  return all.filter((m) => isLiveStatus(m.status));
}

export async function getStandings(): Promise<Map<string, StandingWithTeam[]>> {
  if (!isServerSupabaseConfigured()) return new Map();
  const db = getServerSupabase();
  const { data } = await db
    .from("standings")
    .select("*")
    .order("group_code")
    .order("rank");
  const teams = await teamMap();
  const rows = ((data as Standing[]) ?? []).map((s) => ({
    ...s,
    team: s.team_id ? teams.get(s.team_id) ?? null : null,
  }));
  const map = new Map<string, StandingWithTeam[]>();
  for (const r of rows) {
    if (!map.has(r.group_code)) map.set(r.group_code, []);
    map.get(r.group_code)!.push(r);
  }
  return map;
}

export async function getStandingsForGroup(groupCode: string): Promise<StandingWithTeam[]> {
  const all = await getStandings();
  return all.get(groupCode) ?? [];
}

export { isLiveStatus, isFinishedStatus };
