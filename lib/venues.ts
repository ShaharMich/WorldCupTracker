// ============================================================================
// FIFA World Cup 2026 venues.
//
// football-data.org's free WC feed does NOT include a venue field on matches,
// so we cannot read per-fixture venues from the API. This module hardcodes:
//   1. VENUES        — the 16 host stadiums (name, city, country, capacity).
//   2. MATCH_VENUES  — football-data match id -> venue id, for all 104 fixtures.
//
// ⚠️ VERIFICATION NEEDED ⚠️
// The MATCH_VENUES assignments below are a best-effort reconstruction of the
// official FIFA schedule. The fixed anchors are correct (opening match at
// Estadio Azteca, final at MetLife, Mexico's games in Mexico City, Canada's in
// Toronto/Vancouver, USA's group games in Los Angeles). The remaining per-match
// stadium assignments are region-consistent but NOT yet verified against the
// official FIFA match schedule — verify and correct before relying on them.
// The match ids are stable football-data.org ids (competition WC, season 2026).
// ============================================================================

export type VenueId =
  | "azteca"
  | "akron"
  | "bbva"
  | "bmo"
  | "bcplace"
  | "metlife"
  | "att"
  | "nrg"
  | "mercedes"
  | "linc"
  | "gillette"
  | "levis"
  | "sofi"
  | "lumen"
  | "arrowhead"
  | "hardrock";

export type HostCountry = "USA" | "Mexico" | "Canada";

export interface Venue {
  id: VenueId;
  name: string;
  city: string;
  country: HostCountry;
  capacity: number;
  // Wikimedia Commons photo (1280px), used for the hero/thumbnail images.
  imageUrl: string;
}

// Wikimedia Commons base for the upload thumbnails below.
const WM = "https://upload.wikimedia.org/wikipedia/commons/thumb";

// The 16 stadiums. Capacities are tournament-configuration figures and may
// differ slightly from each stadium's standard listing. imageUrl points at a
// free Wikimedia Commons photo of the stadium (no API/key required).
export const VENUES: Venue[] = [
  // Mexico (3)
  { id: "azteca", name: "Estadio Azteca", city: "Mexico City", country: "Mexico", capacity: 87523,
    imageUrl: `${WM}/0/07/Vista_a%C3%A9rea_del_Estadio_Azteca_-_2026_-_02.jpg/1280px-Vista_a%C3%A9rea_del_Estadio_Azteca_-_2026_-_02.jpg` },
  { id: "akron", name: "Estadio Akron", city: "Guadalajara", country: "Mexico", capacity: 48071,
    imageUrl: `${WM}/1/10/Estadio_Akron_02-07-2022_cabecera_sur_lado_derecho_%283%29.jpg/1280px-Estadio_Akron_02-07-2022_cabecera_sur_lado_derecho_%283%29.jpg` },
  { id: "bbva", name: "Estadio BBVA", city: "Monterrey", country: "Mexico", capacity: 53500,
    imageUrl: `${WM}/5/57/Mexico_Guadalupe_Monterrey_Estadio_BBVA_Bancomer_fifa_world_cup_2026_6.JPG/1280px-Mexico_Guadalupe_Monterrey_Estadio_BBVA_Bancomer_fifa_world_cup_2026_6.JPG` },
  // Canada (2)
  { id: "bmo", name: "BMO Field", city: "Toronto", country: "Canada", capacity: 45000,
    imageUrl: `${WM}/9/91/Toronto_BMO_Field_in_2024.jpg/1280px-Toronto_BMO_Field_in_2024.jpg` },
  { id: "bcplace", name: "BC Place", city: "Vancouver", country: "Canada", capacity: 54500,
    imageUrl: `${WM}/f/ff/BC_Place_2015_Women%27s_FIFA_World_Cup.jpg/1280px-BC_Place_2015_Women%27s_FIFA_World_Cup.jpg` },
  // USA (11)
  { id: "metlife", name: "MetLife Stadium", city: "New York / New Jersey", country: "USA", capacity: 82500,
    imageUrl: `${WM}/0/04/Metlife_stadium_%28Aerial_view%29.jpg/1280px-Metlife_stadium_%28Aerial_view%29.jpg` },
  { id: "att", name: "AT&T Stadium", city: "Dallas", country: "USA", capacity: 80000,
    imageUrl: `${WM}/1/11/Arlington_June_2020_4_%28AT%26T_Stadium%29.jpg/1280px-Arlington_June_2020_4_%28AT%26T_Stadium%29.jpg` },
  { id: "nrg", name: "NRG Stadium", city: "Houston", country: "USA", capacity: 72220,
    imageUrl: `${WM}/3/3e/Nrg_stadium.jpg/1280px-Nrg_stadium.jpg` },
  { id: "mercedes", name: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA", capacity: 71000,
    imageUrl: `${WM}/1/10/Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg/1280px-Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg` },
  { id: "linc", name: "Lincoln Financial Field", city: "Philadelphia", country: "USA", capacity: 69176,
    imageUrl: `${WM}/a/a1/Lincoln_Financial_Field_%28Aerial_view%29.jpg/1280px-Lincoln_Financial_Field_%28Aerial_view%29.jpg` },
  { id: "gillette", name: "Gillette Stadium", city: "Boston", country: "USA", capacity: 65878,
    imageUrl: `${WM}/d/db/Gillette_Stadium_%28Top_View%29.jpg/1280px-Gillette_Stadium_%28Top_View%29.jpg` },
  { id: "levis", name: "Levi's Stadium", city: "San Francisco Bay Area", country: "USA", capacity: 70909,
    imageUrl: `${WM}/a/a6/Levi%27s_Stadium_in_February_2016_prior_to_Super_Bowl_50_%2824398261729%29.jpg/1280px-Levi%27s_Stadium_in_February_2016_prior_to_Super_Bowl_50_%2824398261729%29.jpg` },
  { id: "sofi", name: "SoFi Stadium", city: "Los Angeles", country: "USA", capacity: 70240,
    imageUrl: `${WM}/b/b3/SoFi_Stadium_2023.jpg/1280px-SoFi_Stadium_2023.jpg` },
  { id: "lumen", name: "Lumen Field", city: "Seattle", country: "USA", capacity: 69000,
    imageUrl: `${WM}/9/98/2025_FIFA_Club_World_Cup_-_Seattle_Sounders_FC_vs._Atl%C3%A9tico_Madrid_-_05.jpg/1280px-2025_FIFA_Club_World_Cup_-_Seattle_Sounders_FC_vs._Atl%C3%A9tico_Madrid_-_05.jpg` },
  { id: "arrowhead", name: "Arrowhead Stadium", city: "Kansas City", country: "USA", capacity: 76416,
    imageUrl: `${WM}/a/ac/Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg/1280px-Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg` },
  { id: "hardrock", name: "Hard Rock Stadium", city: "Miami", country: "USA", capacity: 65326,
    imageUrl: `${WM}/c/ce/Hard_Rock_Stadium_for_Super_Bowl_LIV_%2849606710103%29.jpg/1280px-Hard_Rock_Stadium_for_Super_Bowl_LIV_%2849606710103%29.jpg` },
];

const VENUE_BY_ID = new Map<VenueId, Venue>(VENUES.map((v) => [v.id, v]));

export function getVenue(id: VenueId | null | undefined): Venue | null {
  return id ? VENUE_BY_ID.get(id) ?? null : null;
}

// ----------------------------------------------------------------------------
// football-data match id -> venue id, for all 104 WC 2026 fixtures.
// Inline comments record the fixture so assignments can be verified by hand.
// ----------------------------------------------------------------------------
export const MATCH_VENUES: Record<number, VenueId> = {
  // --- Group A (Mexico City / Guadalajara / Monterrey — Mexico plays in MX City) ---
  537327: "azteca", // Mexico vs South Africa (opening match)
  537328: "akron", // South Korea vs Czechia
  537329: "bbva", // Czechia vs South Africa
  537330: "azteca", // Mexico vs South Korea
  537331: "azteca", // Czechia vs Mexico
  537332: "bbva", // South Africa vs South Korea

  // --- Group B (Toronto / Vancouver / SF Bay — Canada plays in Canada) ---
  537333: "bmo", // Canada vs Bosnia-Herzegovina (Canada opener)
  537334: "levis", // Qatar vs Switzerland
  537335: "bcplace", // Switzerland vs Bosnia-Herzegovina
  537336: "bcplace", // Canada vs Qatar
  537337: "bmo", // Switzerland vs Canada
  537338: "levis", // Bosnia-Herzegovina vs Qatar

  // --- Group C (Atlanta / Miami / Philadelphia) ---
  537339: "mercedes", // Brazil vs Morocco
  537340: "hardrock", // Haiti vs Scotland
  537341: "linc", // Brazil vs Haiti
  537342: "hardrock", // Scotland vs Morocco
  537343: "mercedes", // Scotland vs Brazil
  537344: "linc", // Morocco vs Haiti

  // --- Group D (Los Angeles / SF Bay / Seattle — USA plays in LA) ---
  537345: "sofi", // United States vs Paraguay (USA opener)
  537346: "lumen", // Australia vs Turkey
  537347: "levis", // Turkey vs Paraguay
  537348: "sofi", // United States vs Australia
  537349: "sofi", // Turkey vs United States
  537350: "lumen", // Paraguay vs Australia

  // --- Group E (New York/NJ / Boston / Philadelphia) ---
  537351: "metlife", // Germany vs Curaçao
  537352: "gillette", // Ivory Coast vs Ecuador
  537353: "metlife", // Germany vs Ivory Coast
  537354: "linc", // Ecuador vs Curaçao
  537355: "gillette", // Ecuador vs Germany
  537356: "linc", // Curaçao vs Ivory Coast

  // --- Group F (Kansas City / Houston / Dallas) ---
  537357: "arrowhead", // Netherlands vs Japan
  537358: "nrg", // Sweden vs Tunisia
  537359: "att", // Netherlands vs Sweden
  537360: "nrg", // Tunisia vs Japan
  537361: "arrowhead", // Tunisia vs Netherlands
  537362: "att", // Japan vs Sweden

  // --- Group G (Los Angeles / Seattle / SF Bay) ---
  537363: "levis", // Belgium vs Egypt
  537364: "lumen", // Iran vs New Zealand
  537365: "sofi", // Belgium vs Iran
  537366: "lumen", // New Zealand vs Egypt
  537367: "levis", // New Zealand vs Belgium
  537368: "sofi", // Egypt vs Iran

  // --- Group H (Atlanta / Miami / New York-NJ) ---
  537369: "metlife", // Spain vs Cape Verde Islands
  537370: "hardrock", // Saudi Arabia vs Uruguay
  537371: "mercedes", // Spain vs Saudi Arabia
  537372: "hardrock", // Uruguay vs Cape Verde Islands
  537373: "mercedes", // Uruguay vs Spain
  537374: "metlife", // Cape Verde Islands vs Saudi Arabia

  // --- Group I (New York-NJ / Boston / Philadelphia) ---
  537391: "metlife", // France vs Senegal
  537392: "gillette", // Iraq vs Norway
  537393: "gillette", // France vs Iraq
  537394: "linc", // Norway vs Senegal
  537395: "linc", // Norway vs France
  537396: "metlife", // Senegal vs Iraq

  // --- Group J (Dallas / Houston / Kansas City) ---
  537397: "att", // Argentina vs Algeria
  537398: "nrg", // Austria vs Jordan
  537399: "att", // Argentina vs Austria
  537400: "arrowhead", // Jordan vs Algeria
  537401: "nrg", // Jordan vs Argentina
  537402: "arrowhead", // Algeria vs Austria

  // --- Group K (Los Angeles / SF Bay / Seattle) ---
  537403: "sofi", // Portugal vs Congo DR
  537404: "lumen", // Uzbekistan vs Colombia
  537405: "levis", // Portugal vs Uzbekistan
  537406: "lumen", // Colombia vs Congo DR
  537407: "sofi", // Colombia vs Portugal
  537408: "levis", // Congo DR vs Uzbekistan

  // --- Group L (Atlanta / Miami / Toronto) ---
  537409: "mercedes", // England vs Croatia
  537410: "hardrock", // Ghana vs Panama
  537411: "bmo", // England vs Ghana
  537412: "hardrock", // Panama vs Croatia
  537413: "mercedes", // Panama vs England
  537414: "bmo", // Croatia vs Ghana

  // --- Round of 32 (M73–88) ---
  537417: "att",
  537423: "mercedes",
  537415: "sofi",
  537418: "metlife",
  537424: "bmo",
  537416: "hardrock",
  537425: "levis",
  537426: "nrg",
  537422: "linc",
  537421: "gillette",
  537420: "lumen",
  537419: "azteca",
  537429: "arrowhead",
  537428: "bbva",
  537427: "bcplace",
  537430: "sofi",

  // --- Round of 16 (M89–96) ---
  537376: "att",
  537375: "mercedes",
  537377: "metlife",
  537378: "sofi",
  537379: "hardrock",
  537380: "levis",
  537381: "arrowhead",
  537382: "lumen",

  // --- Quarter-finals (M97–100) ---
  537383: "gillette", // Boston
  537384: "sofi", // Los Angeles
  537385: "arrowhead", // Kansas City
  537386: "hardrock", // Miami

  // --- Semi-finals (M101–102) ---
  537387: "att", // Dallas
  537388: "mercedes", // Atlanta

  // --- Third-place play-off (M103) ---
  537389: "hardrock", // Miami

  // --- Final (M104) ---
  537390: "metlife", // New York / New Jersey
};

export function venueForMatch(matchId: number): Venue | null {
  return getVenue(MATCH_VENUES[matchId]);
}
