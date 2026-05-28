import { getServerSupabase } from "@/lib/supabase/server";
import {
  fetchSquad,
  fetchPlayer,
  fetchStandings,
  CLUB_SEASON,
} from "@/lib/api/api-football";
import {
  fetchWCTeams,
  fetchWCMatches,
  type FDTeam,
  type FDMatch,
} from "@/lib/api/football-data";
import { sleep } from "@/lib/utils";
import type { AFPlayerResponse, AFStandingEntry } from "@/types/api";

// API-Football free tier = 100 req/day; space out player calls.
const RATE_LIMIT_MS = 300;

type Logger = (msg: string) => void;
const noop: Logger = () => {};

// ---------- football-data mapping (primary source for teams + fixtures) ----------

// "GROUP_A" -> "A"
function fdGroupCode(group: string | null): string | null {
  if (!group) return null;
  const m = group.match(/([A-L])\s*$/i);
  return m ? m[1].toUpperCase() : null;
}

// football-data stage codes -> human-readable.
function fdStage(stage: string): string {
  switch (stage) {
    case "GROUP_STAGE":
      return "Group Stage";
    case "LAST_32":
      return "Round of 32";
    case "LAST_16":
      return "Round of 16";
    case "QUARTER_FINALS":
      return "Quarter-final";
    case "SEMI_FINALS":
      return "Semi-final";
    case "THIRD_PLACE":
      return "Third-place Play-off";
    case "FINAL":
      return "Final";
    default:
      return stage
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

// football-data status -> our schema's API-Football-style status codes.
function fdStatus(status: string): string {
  switch (status) {
    case "FINISHED":
      return "FT";
    case "IN_PLAY":
      return "2H";
    case "PAUSED":
      return "HT";
    case "SUSPENDED":
    case "POSTPONED":
      return "PST";
    case "CANCELLED":
      return "CANC";
    default:
      return "NS"; // SCHEDULED, TIMED, AWARDED, ...
  }
}

// Builds team_id -> group letter from group-stage fixtures.
function deriveGroups(matches: FDMatch[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of matches) {
    const code = fdGroupCode(m.group);
    if (!code) continue;
    if (m.homeTeam.id != null) map.set(m.homeTeam.id, code);
    if (m.awayTeam.id != null) map.set(m.awayTeam.id, code);
  }
  return map;
}

function mapFDTeam(team: FDTeam, groupCode: string | null) {
  return {
    id: team.id,
    name: team.name,
    country: team.name,
    logo_url: team.crest,
    flag_url: team.crest,
    group_code: groupCode,
    api_data: team as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
}

function mapFDMatch(m: FDMatch) {
  return {
    id: m.id,
    home_team_id: m.homeTeam.id,
    away_team_id: m.awayTeam.id,
    kickoff_utc: m.utcDate,
    stage: fdStage(m.stage),
    group_code: fdGroupCode(m.group),
    venue: m.venue,
    city: null,
    country: null,
    status: fdStatus(m.status),
    elapsed: null,
    home_score: m.score.fullTime?.home ?? null,
    away_score: m.score.fullTime?.away ?? null,
    home_score_ht: m.score.halfTime?.home ?? null,
    away_score_ht: m.score.halfTime?.away ?? null,
    home_score_et: null,
    away_score_et: null,
    home_score_pen: null,
    away_score_pen: null,
    updated_at: new Date().toISOString(),
  };
}

// ---------- API-Football mapping (players + standings) ----------

function pickClubStats(p: AFPlayerResponse) {
  const stats = p.statistics ?? [];
  const club = stats.find((s) => s.league?.name && !/world|nations|qualif/i.test(s.league.name));
  return club ?? stats[0] ?? null;
}

function mapPlayer(p: AFPlayerResponse, teamId: number, jersey: number | null, position: string | null) {
  const club = pickClubStats(p);
  return {
    id: p.player.id,
    name: p.player.name,
    firstname: p.player.firstname,
    lastname: p.player.lastname,
    team_id: teamId,
    nationality: p.player.nationality,
    position: club?.games?.position ?? position,
    age: p.player.age,
    date_of_birth: p.player.birth?.date ?? null,
    height: p.player.height,
    weight: p.player.weight,
    jersey_number: jersey,
    photo_url: p.player.photo,
    club_id: club?.team?.id ?? null,
    club_name: club?.team?.name ?? null,
    club_logo_url: club?.team?.logo ?? null,
    club_country: club?.league?.country ?? null,
    stats_club_season: club
      ? {
          appearances: club.games?.appearences ?? null,
          lineups: club.games?.lineups ?? null,
          minutes: club.games?.minutes ?? null,
          goals: club.goals?.total ?? null,
          assists: club.goals?.assists ?? null,
          yellow_cards: club.cards?.yellow ?? null,
          red_cards: club.cards?.red ?? null,
          rating: club.games?.rating ?? null,
        }
      : null,
    updated_at: new Date().toISOString(),
  };
}

function mapStanding(entry: AFStandingEntry, groupCode: string) {
  return {
    group_code: groupCode,
    team_id: entry.team.id,
    rank: entry.rank,
    played: entry.all.played,
    won: entry.all.win,
    drawn: entry.all.draw,
    lost: entry.all.lose,
    goals_for: entry.all.goals.for,
    goals_against: entry.all.goals.against,
    goal_difference: entry.goalsDiff,
    points: entry.points,
    form: entry.form,
    updated_at: new Date().toISOString(),
  };
}

// ---------- seed steps ----------

// Seeds teams from football-data, assigning group_code from the fixtures draw.
export async function seedTeams(log: Logger = noop): Promise<number[]> {
  const db = getServerSupabase();
  log("Fetching WC 2026 teams (football-data.org)...");
  const [teamsRes, matchesRes] = await Promise.all([fetchWCTeams(), fetchWCMatches()]);
  const groups = deriveGroups(matchesRes.matches);

  const rows = teamsRes.teams.map((t) => mapFDTeam(t, groups.get(t.id) ?? null));
  if (rows.length === 0) {
    log("No teams returned (the WC 2026 draw may not be published yet).");
    return [];
  }
  const { error } = await db.from("teams").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`teams upsert failed: ${error.message}`);
  const assigned = rows.filter((r) => r.group_code).length;
  log(`Upserted ${rows.length} teams (${assigned} with a group assigned).`);
  return rows.map((r) => r.id);
}

// Seeds fixtures from football-data.
export async function seedFixtures(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Fetching WC 2026 fixtures (football-data.org)...");
  const { matches } = await fetchWCMatches();
  const rows = matches.map(mapFDMatch);
  if (rows.length === 0) {
    log("No fixtures returned yet.");
    return;
  }
  const { error } = await db.from("matches").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`matches upsert failed: ${error.message}`);
  log(`Upserted ${rows.length} fixtures.`);
}

// NOTE: players come from API-Football, which keys teams by ITS own ids — these
// differ from football-data team ids. Player seeding therefore needs an
// API-Football plan with WC 2026 access and an id cross-walk; it is a no-op
// against football-data-seeded teams. Left intact for when that plan is added.
export async function seedSquadsAndPlayers(
  teamIds: number[],
  log: Logger = noop,
): Promise<void> {
  const db = getServerSupabase();
  for (const teamId of teamIds) {
    await sleep(RATE_LIMIT_MS);
    const squads = await fetchSquad(teamId);
    const squad = squads[0];
    if (!squad) {
      log(`Team ${teamId}: no squad data yet.`);
      continue;
    }
    log(`Team ${teamId}: ${squad.players.length} players.`);

    for (const sp of squad.players) {
      await sleep(RATE_LIMIT_MS);
      try {
        const detail = await fetchPlayer(sp.id, CLUB_SEASON);
        const p = detail[0];
        const row = p
          ? mapPlayer(p, teamId, sp.number, sp.position)
          : {
              id: sp.id,
              name: sp.name,
              team_id: teamId,
              position: sp.position,
              age: sp.age,
              jersey_number: sp.number,
              photo_url: sp.photo,
              updated_at: new Date().toISOString(),
            };
        const { error } = await db.from("players").upsert(row, { onConflict: "id" });
        if (error) log(`  player ${sp.id} upsert failed: ${error.message}`);
      } catch (e) {
        log(`  player ${sp.id} (${sp.name}) failed: ${(e as Error).message}`);
      }
    }
  }
}

export async function seedStandings(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Fetching group standings (API-Football)...");
  const standings = await fetchStandings();
  const league = standings[0]?.league;
  if (!league) {
    log("No standings returned yet.");
    return;
  }
  const rows = league.standings.flatMap((group) =>
    group.map((entry) => mapStanding(entry, entry.group?.replace(/^Group\s+/i, "").trim() || "?")),
  );
  if (rows.length === 0) {
    log("No standings rows.");
    return;
  }
  const { error } = await db
    .from("standings")
    .upsert(rows, { onConflict: "group_code,team_id" });
  if (error) throw new Error(`standings upsert failed: ${error.message}`);
  log(`Upserted ${rows.length} standings rows.`);
}

export interface SeedOptions {
  teams?: boolean;
  players?: boolean;
  fixtures?: boolean;
  standings?: boolean;
}

export async function runSeed(
  opts: SeedOptions = { teams: true, players: true, fixtures: true, standings: true },
  log: Logger = noop,
): Promise<void> {
  let teamIds: number[] = [];
  if (opts.teams) teamIds = await seedTeams(log);
  if (opts.fixtures) await seedFixtures(log);
  if (opts.players) {
    if (teamIds.length === 0) {
      const db = getServerSupabase();
      const { data } = await db.from("teams").select("id");
      teamIds = (data ?? []).map((t) => t.id as number);
    }
    await seedSquadsAndPlayers(teamIds, log);
  }
  if (opts.standings) await seedStandings(log);
  log("Seed complete.");
}
