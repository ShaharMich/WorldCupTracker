// FIFA/Coca-Cola Men's World Ranking — hardcoded catalog.
//
// API-Football has NO FIFA-ranking endpoint (its only "rank" is a team's
// position within a league's standings). So — exactly like the stadium catalog
// in lib/venues.ts, which exists because the match feed carries no venue — we
// hardcode the published FIFA ranking and seed it into teams.fifa_rank.
//
// Snapshot: FIFA/Coca-Cola Men's World Ranking published 1 April 2026 (the
// pre-tournament list). FIFA republishes roughly monthly; when a new list comes
// out, update the numbers below and re-run `npm run seed -- rankings`.
//
// Keyed by canonical country name; lookup normalizes case/accents/punctuation
// and applies ALIASES so a team stored under a different spelling in our teams
// table (sourced from football-data.org) still resolves — e.g. "Turkey" →
// "Türkiye", "United States" → "USA", "Ivory Coast" → "Côte d'Ivoire". Teams not
// listed here resolve to null and simply render no rank badge in the UI.
const RANKINGS: Record<string, number> = {
  France: 1,
  Spain: 2,
  Argentina: 3,
  England: 4,
  Portugal: 5,
  Brazil: 6,
  Netherlands: 7,
  Morocco: 8,
  Belgium: 9,
  Germany: 10,
  Croatia: 11,
  Italy: 12,
  Colombia: 13,
  Senegal: 14,
  Mexico: 15,
  USA: 16,
  Uruguay: 17,
  Japan: 18,
  Switzerland: 19,
  Denmark: 20,
  Iran: 21,
  Türkiye: 22,
  Ecuador: 23,
  Austria: 24,
  "South Korea": 25,
  Nigeria: 26,
  Australia: 27,
  Algeria: 28,
  Egypt: 29,
  Canada: 30,
  Norway: 31,
  Ukraine: 32,
  Panama: 33,
  "Côte d'Ivoire": 34,
  Poland: 35,
  Russia: 36,
  Wales: 37,
  Sweden: 38,
  Serbia: 39,
  Paraguay: 40,
  Czechia: 41,
  Hungary: 42,
  Scotland: 43,
  Tunisia: 44,
  Cameroon: 45,
  "Congo DR": 46,
  Greece: 47,
  Slovakia: 48,
  Venezuela: 49,
  Uzbekistan: 50,
  "Costa Rica": 51,
  Mali: 52,
  Peru: 53,
  Chile: 54,
  Qatar: 55,
  Romania: 56,
  Iraq: 57,
  Slovenia: 58,
  "Republic of Ireland": 59,
  "South Africa": 60,
  "Saudi Arabia": 61,
  "Burkina Faso": 62,
  Jordan: 63,
  Albania: 64,
  "Bosnia and Herzegovina": 65,
  Honduras: 66,
  "North Macedonia": 67,
  UAE: 68,
  "Cabo Verde": 69,
  "Northern Ireland": 70,
  Jamaica: 71,
  Georgia: 72,
  Finland: 73,
  Ghana: 74,
  Iceland: 75,
  Bolivia: 76,
  Israel: 77,
  Kosovo: 78,
  Oman: 79,
  Guinea: 80,
  "Curaçao": 82,
  Haiti: 83,
  "New Zealand": 85,
};

// Normalized variant spelling -> normalized canonical name (the keys above).
// football-data.org and FIFA spell a handful of nations differently; this
// collapses the variants onto the catalog entry.
const ALIASES: Record<string, string> = {
  unitedstates: "usa",
  unitedstatesofamerica: "usa",
  turkey: "turkiye",
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  ivorycoast: "cotedivoire",
  czechrepublic: "czechia",
  drcongo: "congodr",
  congodemocraticrepublic: "congodr",
  democraticrepublicofcongo: "congodr",
  democraticrepublicofthecongo: "congodr",
  ireland: "republicofireland",
  bosniaherzegovina: "bosniaandherzegovina",
  bosnia: "bosniaandherzegovina",
  unitedarabemirates: "uae",
  capeverde: "caboverde",
  capeverdeislands: "caboverde",
};

// NFD splits accented letters into base + combining mark; [^a-z] then drops the
// marks (and spaces/punctuation), so "Türkiye" -> "turkiye", "Côte" -> "cote".
function normalize(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
}

const BY_KEY: Map<string, number> = new Map(
  Object.entries(RANKINGS).map(([name, rank]) => [normalize(name), rank]),
);

// Current FIFA world ranking for a team by name, or null if not in the catalog.
export function fifaRankFor(teamName: string): number | null {
  const key = normalize(teamName);
  return BY_KEY.get(ALIASES[key] ?? key) ?? null;
}
