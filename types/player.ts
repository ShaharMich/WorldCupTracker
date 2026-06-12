export type PlayerPosition =
  | "Goalkeeper" | "Defender" | "Midfielder" | "Attacker";

export interface CareerClub {
  club: string;
  season: string;
  appearances: number | null;
  goals: number | null;
}

export interface ClubSeasonStats {
  appearances: number | null;
  lineups: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  rating: string | null;
}

// One World Cup 2026 match's stat line for a player (used for the per-match
// breakdown on the player profile). Sourced from /fixtures/players per fixture.
export interface WCMatchStat {
  fixture_id: number;
  date: string; // ISO kickoff
  opponent: string;
  opponent_id: number | null;
  home: boolean; // was the player's team the home side?
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  rating: string | null;
}

// WC 2026 tournament stats: the aggregated totals (same shape as a season) plus
// an optional newest-first per-match breakdown.
export interface WCStats extends ClubSeasonStats {
  matches?: WCMatchStat[];
}

export interface Player {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  team_id: number | null;
  nationality: string | null;
  position: string | null;
  age: number | null;
  date_of_birth: string | null;
  height: string | null;
  weight: string | null;
  jersey_number: number | null;
  photo_url: string | null;
  club_id: number | null;
  club_name: string | null;
  club_logo_url: string | null;
  club_country: string | null;
  stats_club_season: ClubSeasonStats | null;
  stats_wc: WCStats | null;
  career_clubs: CareerClub[] | null;
  national_team_caps: number | null;
  national_team_goals: number | null;
  wc_appearances: number | null;
  wc_goals: number | null;
  updated_at: string;
}
