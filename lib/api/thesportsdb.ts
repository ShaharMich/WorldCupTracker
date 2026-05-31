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
  strSport: string | null; // "Soccer", "American Football", "Rugby", ...
  strNationality: string | null;
  idTeam: string | null;
  strTeam: string | null; // current club
  strPosition: string | null;
  strThumb: string | null;
  strCutout: string | null;
  strDescriptionEN: string | null;
  dateBorn: string | null;
}

// TheSportsDB indexes many sports under the same name (e.g. a soccer player and
// a retired NFL player can share a name). We only want association football, so
// every lookup is filtered to this sport and any other result is treated as a
// no-match (caller falls back to the silhouette).
export const SOCCER_SPORT = "Soccer";

function isSoccer(p: TSDBPlayer): boolean {
  return (p.strSport ?? "").trim().toLowerCase() === SOCCER_SPORT.toLowerCase();
}

export interface TSDBTeam {
  idTeam: string;
  strTeam: string;
  strCountry: string | null;
  strBadge: string | null;
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
  // A name can return players from several sports; take the first soccer match
  // and ignore the rest so we never enrich with an NFL/rugby/etc. profile.
  return data?.player?.find(isSoccer) ?? null;
}

export async function lookupPlayer(id: string): Promise<TSDBPlayer | null> {
  const data = await tsdbFetch<{ players: TSDBPlayer[] | null }>(
    `/lookupplayer.php?id=${encodeURIComponent(id)}`,
  );
  const player = data?.players?.[0] ?? null;
  return player && isSoccer(player) ? player : null;
}

// Returns the best available photo URL for a player name, or null.
export async function findPlayerPhoto(name: string): Promise<string | null> {
  const player = await searchPlayer(name);
  return player?.strCutout || player?.strThumb || null;
}

export async function lookupTeam(id: string): Promise<TSDBTeam | null> {
  const data = await tsdbFetch<{ teams: TSDBTeam[] | null }>(
    `/lookupteam.php?id=${encodeURIComponent(id)}`,
  );
  return data?.teams?.[0] ?? null;
}

export interface PlayerEnrichment {
  photo_url: string | null;
  club_id: number | null;
  club_name: string | null;
  club_logo_url: string | null;
  club_country: string | null;
}

// Outcome of a checked enrichment, so callers can tell three cases apart:
//   matched  — a soccer player was found (use the data)
//   no-match — the API responded but no soccer player exists for this name
//   error    — network/HTTP failure; the result is unknown. Callers MUST NOT
//              treat this as "no data" and clear existing rows.
export type EnrichOutcome =
  | { status: "matched"; data: PlayerEnrichment }
  | { status: "no-match" }
  | { status: "error" };

const EMPTY_ENRICHMENT: PlayerEnrichment = {
  photo_url: null,
  club_id: null,
  club_name: null,
  club_logo_url: null,
  club_country: null,
};

// Club badges are looked up per-team; many players share a club, so memoize.
const badgeCache = new Map<string, { logo: string | null; country: string | null }>();

// Raw player search that distinguishes a successful empty response from a
// transport failure (so we never confuse "no such player" with "request failed").
async function searchPlayersRaw(
  name: string,
): Promise<{ ok: boolean; players: TSDBPlayer[] }> {
  try {
    const res = await fetch(`${baseUrl()}/searchplayers.php?p=${encodeURIComponent(name)}`, {
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, players: [] };
    const data = (await res.json()) as { player: TSDBPlayer[] | null };
    return { ok: true, players: data?.player ?? [] };
  } catch {
    return { ok: false, players: [] };
  }
}

// Checked photo + current-club lookup. Never throws. Filters to soccer players
// and reports whether the lookup actually failed vs. genuinely found nothing.
export async function enrichPlayerChecked(name: string): Promise<EnrichOutcome> {
  const search = await searchPlayersRaw(name);
  if (!search.ok) return { status: "error" };

  const player = search.players.find(isSoccer);
  if (!player) return { status: "no-match" };

  const result: PlayerEnrichment = {
    photo_url: player.strCutout || player.strThumb || null,
    club_id: player.idTeam ? Number(player.idTeam) : null,
    club_name: player.strTeam || null,
    club_logo_url: null,
    club_country: null,
  };

  if (player.idTeam) {
    if (!badgeCache.has(player.idTeam)) {
      let badge: { logo: string | null; country: string | null } = { logo: null, country: null };
      try {
        const team = await lookupTeam(player.idTeam);
        badge = { logo: team?.strBadge ?? null, country: team?.strCountry ?? null };
      } catch {
        /* leave nulls — a missing badge doesn't invalidate the player match */
      }
      badgeCache.set(player.idTeam, badge);
    }
    const cached = badgeCache.get(player.idTeam)!;
    result.club_logo_url = cached.logo;
    result.club_country = cached.country;
  }

  return { status: "matched", data: result };
}

// Best-effort photo + current-club lookup for a player name. Never throws;
// returns all-null on miss or failure so the base row still seeds. This is
// additive-only (callers write on a hit, never clear on a miss), so collapsing
// error + no-match to "empty" here is safe.
export async function enrichPlayer(name: string): Promise<PlayerEnrichment> {
  const outcome = await enrichPlayerChecked(name);
  return outcome.status === "matched" ? outcome.data : EMPTY_ENRICHMENT;
}
