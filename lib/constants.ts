export const WC = {
  name: "FIFA World Cup 2026",
  openingMatchUtc: "2026-06-11T19:00:00Z", // Opening match: Mexico vs South Africa, Estadio Azteca
  finalUtc: "2026-07-19T19:00:00Z", // MetLife Stadium, New Jersey
  teams: 48,
  matches: 104,
  groups: 12,
  hostCities: {
    USA: [
      "New York", "Los Angeles", "Dallas", "San Francisco", "Miami",
      "Atlanta", "Seattle", "Boston", "Kansas City", "Houston", "Philadelphia",
    ],
    Mexico: ["Mexico City", "Guadalajara", "Monterrey"],
    Canada: ["Toronto", "Vancouver"],
  },
} as const;

export const GROUP_CODES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/teams", label: "Teams" },
  { href: "/groups", label: "Groups" },
  { href: "/matches", label: "Schedule" },
  { href: "/bracket", label: "Bracket" },
  { href: "/stats", label: "Stats" },
  { href: "/stadiums", label: "Stadiums" },
] as const;

// Knockout rounds in bracket order, mapped to the stage labels stored on matches
// (see fdStage in lib/seed.ts).
export const KNOCKOUT_STAGES = [
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Final",
] as const;
