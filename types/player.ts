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
  stats_wc: ClubSeasonStats | null;
  career_clubs: CareerClub[] | null;
  national_team_caps: number | null;
  national_team_goals: number | null;
  wc_appearances: number | null;
  wc_goals: number | null;
  updated_at: string;
}
