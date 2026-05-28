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

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
