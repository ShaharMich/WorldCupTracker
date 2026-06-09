// Shared favorites types + helpers. Favorites are keyed by `${type}:${itemId}`
// in client state. Guests persist them to localStorage; logged-in users persist
// to the Supabase `favorites` table (see supabase/schema.sql).

export type FavoriteType = "team" | "player";

export interface FavoriteRef {
  type: FavoriteType;
  itemId: number;
}

export function favKey(type: FavoriteType, itemId: number): string {
  return `${type}:${itemId}`;
}

export function parseFavKey(key: string): FavoriteRef | null {
  const [type, rawId] = key.split(":");
  const itemId = Number(rawId);
  if ((type !== "team" && type !== "player") || !Number.isFinite(itemId)) return null;
  return { type, itemId };
}

const STORAGE_KEY = "wc2026:favorites";

// --- localStorage (guest) persistence -----------------------------------

export function readLocalFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((k): k is string => typeof k === "string"));
  } catch {
    return new Set();
  }
}

export function writeLocalFavorites(keys: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Ignore quota / privacy-mode errors — favorites are best-effort for guests.
  }
}

export function clearLocalFavorites(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
