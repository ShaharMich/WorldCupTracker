export type GroupCode =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Confederation =
  | "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC";

export interface Team {
  id: number;
  name: string;
  country: string | null;
  logo_url: string | null;
  flag_url: string | null;
  group_code: string | null;
  confederation: string | null;
  wc_appearances: number | null;
  wc_titles: number;
  coach_id: number | null;
  coach_name: string | null;
  coach_photo_url: string | null;
  coach_nationality: string | null;
  api_data: unknown | null;
  updated_at: string;
}
