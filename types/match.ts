export type MatchStatus =
  | "NS" | "1H" | "HT" | "2H" | "ET" | "BT"
  | "P" | "FT" | "AET" | "PEN" | "PST" | "CANC";

export const LIVE_STATUSES: MatchStatus[] = ["1H", "HT", "2H", "ET", "BT", "P", "PEN"];

export function isLiveStatus(status: string | null | undefined): boolean {
  return !!status && (LIVE_STATUSES as string[]).includes(status);
}

export function isFinishedStatus(status: string | null | undefined): boolean {
  return status === "FT" || status === "AET" || status === "PEN";
}

export interface MatchEvent {
  type: string; // "Goal" | "Card" | "subst" | "Var"
  team: string | null;
  player: string | null;
  assist?: string | null;
  minute: number | null;
  extra?: number | null;
  detail: string | null;
}

export interface MatchStatItem {
  type: string;
  home: number | string | null;
  away: number | string | null;
}

export interface LineupPlayer {
  id: number | null;
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null;
}

export interface TeamLineup {
  team_id: number | null;
  team_name: string | null;
  formation: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach: string | null;
}

export interface Match {
  id: number;
  home_team_id: number | null;
  away_team_id: number | null;
  kickoff_utc: string;
  stage: string | null;
  group_code: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  status: string;
  elapsed: number | null;
  home_score: number | null;
  away_score: number | null;
  home_score_ht: number | null;
  away_score_ht: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
  home_score_pen: number | null;
  away_score_pen: number | null;
  events: MatchEvent[] | null;
  stats: MatchStatItem[] | null;
  lineups: TeamLineup[] | null;
  af_fixture_id: number | null;
  updated_at: string;
}

export interface MatchWithTeams extends Match {
  home_team: import("./team").Team | null;
  away_team: import("./team").Team | null;
}

export interface Standing {
  id: number;
  group_code: string;
  team_id: number | null;
  rank: number | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: string | null;
  updated_at: string;
}

export interface StandingWithTeam extends Standing {
  team: import("./team").Team | null;
}
