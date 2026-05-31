// football-data.org v4 — primary source for teams / fixtures (free tier includes WC).
const BASE_URL = "https://api.football-data.org/v4";
export const WC_COMPETITION = "WC";

function getToken(): string {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error("Missing FOOTBALL_DATA_TOKEN. Add it to .env.local.");
  }
  return token;
}

async function fdFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": getToken() },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = res.statusText;
    }
    throw new Error(`football-data ${path} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

// ---------- response shapes (only fields we use) ----------

export interface FDSquadMember {
  id: number;
  name: string;
  position: string | null; // "Goalkeeper" | "Defence" | "Centre-Back" | ...
  dateOfBirth: string | null; // "1986-06-16"
  nationality: string | null;
}

export interface FDTeam {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  squad?: FDSquadMember[]; // included by /competitions/WC/teams
}

export interface FDTeamsResponse {
  count: number;
  competition: { id: number; code: string; name: string };
  teams: FDTeam[];
}

export interface FDScoreLine {
  home: number | null;
  away: number | null;
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | ...
  stage: string; // GROUP_STAGE | LAST_16 | ...
  group: string | null; // GROUP_A | null
  matchday: number | null;
  venue: string | null;
  homeTeam: { id: number | null; name: string | null; crest: string | null };
  awayTeam: { id: number | null; name: string | null; crest: string | null };
  score: {
    winner: string | null;
    duration: string;
    fullTime: FDScoreLine;
    halfTime: FDScoreLine;
  };
}

export interface FDMatchesResponse {
  count: number;
  matches: FDMatch[];
}

// ---------- endpoints ----------

export function fetchWCTeams(): Promise<FDTeamsResponse> {
  return fdFetch<FDTeamsResponse>(`/competitions/${WC_COMPETITION}/teams`);
}

export function fetchWCMatches(): Promise<FDMatchesResponse> {
  return fdFetch<FDMatchesResponse>(`/competitions/${WC_COMPETITION}/matches`);
}

export function fetchWCStandings<T = unknown>(): Promise<T> {
  return fdFetch<T>(`/competitions/${WC_COMPETITION}/standings`);
}

export function fetchWCScorers<T = unknown>(): Promise<T> {
  return fdFetch<T>(`/competitions/${WC_COMPETITION}/scorers`);
}
