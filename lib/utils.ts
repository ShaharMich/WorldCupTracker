import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----- Date / time formatting -----

export function formatKickoff(utc: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utc));
}

export function formatKickoffTime(utc: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utc));
}

export function formatMatchDay(utc: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(utc));
}

// Stable yyyy-mm-dd key (UTC) for grouping fixtures by date.
export function dateKey(utc: string): string {
  return new Date(utc).toISOString().slice(0, 10);
}

// ----- Flags -----

// flagcdn.com expects ISO-3166 alpha-2 lowercase codes.
export function flagUrl(countryCode: string | null | undefined, width = 80): string | null {
  if (!countryCode) return null;
  return `https://flagcdn.com/w${width}/${countryCode.toLowerCase()}.png`;
}

// ----- Misc -----

export function positionGroup(position: string | null | undefined): string {
  switch (position) {
    case "Goalkeeper":
      return "Goalkeepers";
    case "Defender":
      return "Defenders";
    case "Midfielder":
      return "Midfielders";
    case "Attacker":
      return "Attackers";
    default:
      return "Other";
  }
}

export const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];

// football-data.org uses granular position labels (e.g. "Centre-Back",
// "Defensive Midfield", "Offence"). Collapse them to the 4 canonical buckets
// the squad UI groups by.
export function normalizeFootballDataPosition(
  position: string | null | undefined,
): "Goalkeeper" | "Defender" | "Midfielder" | "Attacker" | null {
  if (!position) return null;
  const p = position.toLowerCase();
  if (p.includes("keeper") || p === "gk") return "Goalkeeper";
  if (p.includes("back") || p.includes("defen")) return "Defender";
  if (p.includes("midfield")) return "Midfielder";
  if (
    p.includes("forward") ||
    p.includes("winger") ||
    p.includes("offen") ||
    p.includes("striker") ||
    p.includes("attack")
  )
    return "Attacker";
  return null;
}

// Whole years between a yyyy-mm-dd date of birth and now.
export function ageFromDateOfBirth(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
