// TheSportsDB — supplementary player photos, badges, bios.
function getKey(): string {
  return process.env.THESPORTSDB_KEY || "3";
}

function baseUrl(): string {
  return `https://www.thesportsdb.com/api/v1/json/${getKey()}`;
}

export interface TSDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strNationality: string | null;
  strTeam: string | null;
  strPosition: string | null;
  strThumb: string | null;
  strCutout: string | null;
  strDescriptionEN: string | null;
  dateBorn: string | null;
}

async function tsdbFetch<T>(path: string): Promise<T | null> {
  const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function searchPlayer(name: string): Promise<TSDBPlayer | null> {
  const data = await tsdbFetch<{ player: TSDBPlayer[] | null }>(
    `/searchplayers.php?p=${encodeURIComponent(name)}`,
  );
  return data?.player?.[0] ?? null;
}

export async function lookupPlayer(id: string): Promise<TSDBPlayer | null> {
  const data = await tsdbFetch<{ players: TSDBPlayer[] | null }>(
    `/lookupplayer.php?id=${encodeURIComponent(id)}`,
  );
  return data?.players?.[0] ?? null;
}

// Returns the best available photo URL for a player name, or null.
export async function findPlayerPhoto(name: string): Promise<string | null> {
  const player = await searchPlayer(name);
  return player?.strCutout || player?.strThumb || null;
}
