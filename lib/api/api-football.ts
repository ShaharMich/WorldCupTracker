import type {
  ApiFootballResponse,
  AFTeamEntry,
  AFSquadResponse,
  AFPlayerResponse,
  AFFixture,
  AFStandingsResponse,
  AFFixtureStatistics,
  AFFixtureEvent,
  AFLineupEntry,
  AFFixturePlayersEntry,
  AFTransferResponse,
  AFCoach,
} from "@/types/api";

const BASE_URL = "https://v3.football.api-sports.io";

export const WC_LEAGUE_ID = 1;
export const WC_SEASON = 2026;
export const CLUB_SEASON = 2025; // 2025/26 club season

function getKey(): string {
  const key = process.env.API_SPORTS_KEY;
  if (!key) {
    throw new Error("Missing API_SPORTS_KEY. Add it to .env.local.");
  }
  return key;
}

async function afFetch<T>(
  path: string,
  params: Record<string, string | number>,
): Promise<T[]> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  const res = await fetch(`${BASE_URL}${path}?${qs.toString()}`, {
    headers: { "x-apisports-key": getKey() },
    // We do our own Supabase caching; don't let Next cache these.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API-Football ${path} failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiFootballResponse<T>;

  // API-Football returns 200 with an `errors` object on quota/param issues.
  if (json.errors && !Array.isArray(json.errors) && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football ${path} error: ${JSON.stringify(json.errors)}`);
  }

  return json.response ?? [];
}

export function fetchTeams(): Promise<AFTeamEntry[]> {
  return afFetch<AFTeamEntry>("/teams", { league: WC_LEAGUE_ID, season: WC_SEASON });
}

export function fetchSquad(teamId: number): Promise<AFSquadResponse[]> {
  return afFetch<AFSquadResponse>("/players/squads", { team: teamId });
}

export function fetchPlayer(
  playerId: number,
  season: number = CLUB_SEASON,
): Promise<AFPlayerResponse[]> {
  return afFetch<AFPlayerResponse>("/players", { id: playerId, season });
}

// Player career history (club moves with dates + fees).
export function fetchTransfers(playerId: number): Promise<AFTransferResponse[]> {
  return afFetch<AFTransferResponse>("/transfers", { player: playerId });
}

// Coaches who have managed a team (the current one has a career entry with end=null).
export function fetchCoaches(teamId: number): Promise<AFCoach[]> {
  return afFetch<AFCoach>("/coachs", { team: teamId });
}

export function fetchFixtures(): Promise<AFFixture[]> {
  return afFetch<AFFixture>("/fixtures", { league: WC_LEAGUE_ID, season: WC_SEASON });
}

export function fetchFixtureById(fixtureId: number): Promise<AFFixture[]> {
  return afFetch<AFFixture>("/fixtures", { id: fixtureId });
}

export function fetchStandings(): Promise<AFStandingsResponse[]> {
  return afFetch<AFStandingsResponse>("/standings", {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  });
}

export function fetchFixtureStatistics(
  fixtureId: number,
): Promise<AFFixtureStatistics[]> {
  return afFetch<AFFixtureStatistics>("/fixtures/statistics", { fixture: fixtureId });
}

export function fetchFixtureEvents(fixtureId: number): Promise<AFFixtureEvent[]> {
  return afFetch<AFFixtureEvent>("/fixtures/events", { fixture: fixtureId });
}

export function fetchFixtureLineups(fixtureId: number): Promise<AFLineupEntry[]> {
  return afFetch<AFLineupEntry>("/fixtures/lineups", { fixture: fixtureId });
}

// Per-player stats for one fixture (minutes, goals, assists, cards, rating).
export function fetchFixturePlayers(fixtureId: number): Promise<AFFixturePlayersEntry[]> {
  return afFetch<AFFixturePlayersEntry>("/fixtures/players", { fixture: fixtureId });
}
