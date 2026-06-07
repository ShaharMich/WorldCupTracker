import { getServerSupabase } from "@/lib/supabase/server";
import {
  fetchTeams,
  fetchSquad,
  fetchPlayer,
  fetchTransfers,
  fetchStandings,
  CLUB_SEASON,
} from "@/lib/api/api-football";
import {
  fetchWCTeams,
  fetchWCMatches,
  type FDTeam,
  type FDMatch,
} from "@/lib/api/football-data";
import { venueForMatch } from "@/lib/venues";
import { sleep } from "@/lib/utils";
import type {
  AFPlayerResponse,
  AFSquadPlayer,
  AFTransferResponse,
  AFStandingEntry,
} from "@/types/api";

// API-Football Pro plan = 7,500 req/day; a small pause keeps us well-behaved.
const RATE_LIMIT_MS = 150;

type Logger = (msg: string) => void;
const noop: Logger = () => {};

// ---------- football-data mapping (primary source for teams + fixtures) ----------

// "GROUP_A" -> "A"
function fdGroupCode(group: string | null): string | null {
  if (!group) return null;
  const m = group.match(/([A-L])\s*$/i);
  return m ? m[1].toUpperCase() : null;
}

// football-data stage codes -> human-readable.
function fdStage(stage: string): string {
  switch (stage) {
    case "GROUP_STAGE":
      return "Group Stage";
    case "LAST_32":
      return "Round of 32";
    case "LAST_16":
      return "Round of 16";
    case "QUARTER_FINALS":
      return "Quarter-final";
    case "SEMI_FINALS":
      return "Semi-final";
    case "THIRD_PLACE":
      return "Third-place Play-off";
    case "FINAL":
      return "Final";
    default:
      return stage
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

// football-data status -> our schema's API-Football-style status codes.
function fdStatus(status: string): string {
  switch (status) {
    case "FINISHED":
      return "FT";
    case "IN_PLAY":
      return "2H";
    case "PAUSED":
      return "HT";
    case "SUSPENDED":
    case "POSTPONED":
      return "PST";
    case "CANCELLED":
      return "CANC";
    default:
      return "NS"; // SCHEDULED, TIMED, AWARDED, ...
  }
}

// Builds team_id -> group letter from group-stage fixtures.
function deriveGroups(matches: FDMatch[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of matches) {
    const code = fdGroupCode(m.group);
    if (!code) continue;
    if (m.homeTeam.id != null) map.set(m.homeTeam.id, code);
    if (m.awayTeam.id != null) map.set(m.awayTeam.id, code);
  }
  return map;
}

function mapFDTeam(team: FDTeam, groupCode: string | null) {
  return {
    id: team.id,
    name: team.name,
    country: team.name,
    logo_url: team.crest,
    flag_url: team.crest,
    group_code: groupCode,
    api_data: team as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
}

function mapFDMatch(m: FDMatch) {
  // football-data's free WC feed carries no venue, so resolve it from our
  // hardcoded catalog (lib/venues.ts). Prefer the API value if it ever appears.
  const venue = venueForMatch(m.id);
  return {
    id: m.id,
    home_team_id: m.homeTeam.id,
    away_team_id: m.awayTeam.id,
    kickoff_utc: m.utcDate,
    stage: fdStage(m.stage),
    group_code: fdGroupCode(m.group),
    venue: m.venue ?? venue?.name ?? null,
    city: venue?.city ?? null,
    country: venue?.country ?? null,
    status: fdStatus(m.status),
    elapsed: null,
    home_score: m.score.fullTime?.home ?? null,
    away_score: m.score.fullTime?.away ?? null,
    home_score_ht: m.score.halfTime?.home ?? null,
    away_score_ht: m.score.halfTime?.away ?? null,
    home_score_et: null,
    away_score_et: null,
    home_score_pen: null,
    away_score_pen: null,
    updated_at: new Date().toISOString(),
  };
}

// ---------- API-Football mapping (players + standings) ----------

// A player's `/players?season=` response holds one statistics entry per
// competition (league, cup, Champions League, internationals...). Treat any
// entry whose league isn't an international one as a club competition.
function isClubStat(leagueName: string | null | undefined): boolean {
  return !!leagueName && !/world cup|nations|qualif|friendlies.*national|olympic/i.test(leagueName);
}

// Picks the player's primary club (most minutes across club competitions) and
// sums their 2025/26 totals across all club competitions for the stat cards.
function aggregateClubSeason(p: AFPlayerResponse) {
  const club = (p.statistics ?? []).filter((s) => isClubStat(s.league?.name));
  if (club.length === 0) return { primary: null, totals: null };

  const primary = club.reduce((best, s) =>
    (s.games?.minutes ?? 0) > (best.games?.minutes ?? 0) ? s : best,
  );

  const sum = (pick: (s: (typeof club)[number]) => number | null | undefined) =>
    club.reduce((acc, s) => acc + (pick(s) ?? 0), 0);

  // Minutes-weighted average rating across club competitions.
  const ratingWeight = club.reduce(
    (acc, s) => {
      const r = s.games?.rating ? Number(s.games.rating) : NaN;
      const m = s.games?.minutes ?? 0;
      return Number.isFinite(r) && m > 0
        ? { sum: acc.sum + r * m, mins: acc.mins + m }
        : acc;
    },
    { sum: 0, mins: 0 },
  );
  const rating = ratingWeight.mins > 0 ? (ratingWeight.sum / ratingWeight.mins).toFixed(2) : null;

  return {
    primary,
    totals: {
      appearances: sum((s) => s.games?.appearences),
      lineups: sum((s) => s.games?.lineups),
      minutes: sum((s) => s.games?.minutes),
      goals: sum((s) => s.goals?.total),
      assists: sum((s) => s.goals?.assists),
      yellow_cards: sum((s) => s.cards?.yellow),
      red_cards: sum((s) => s.cards?.red),
      rating,
    },
  };
}

// Builds a career timeline (newest first) from transfer history. Per-club
// appearance/goal totals aren't available from /transfers, so they stay null;
// the UI renders the club + year and omits the counts when null.
function buildCareer(transfers: AFTransferResponse[]) {
  const moves = transfers[0]?.transfers ?? [];
  if (moves.length === 0) return null;
  const career = moves
    .slice()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map((m) => ({
      club: m.teams.in?.name ?? "Unknown",
      season: m.date ? m.date.slice(0, 4) : "",
      appearances: null,
      goals: null,
    }))
    .filter((c) => c.club !== "Unknown");
  return career.length > 0 ? career : null;
}

// Maps an API-Football player (detail + transfers + squad slot) to a DB row.
// `teamId` is the football-data team id (our teams table is keyed that way),
// resolved via the crosswalk so players still link to seeded teams + fixtures.
function mapPlayer(
  p: AFPlayerResponse,
  transfers: AFTransferResponse[],
  teamId: number,
  squad: AFSquadPlayer,
) {
  const { primary, totals } = aggregateClubSeason(p);
  return {
    id: p.player.id,
    name: p.player.name,
    firstname: p.player.firstname,
    lastname: p.player.lastname,
    team_id: teamId,
    nationality: p.player.nationality,
    position: primary?.games?.position ?? squad.position,
    age: p.player.age ?? squad.age,
    date_of_birth: p.player.birth?.date ?? null,
    height: p.player.height,
    weight: p.player.weight,
    jersey_number: squad.number,
    photo_url: p.player.photo ?? squad.photo,
    club_id: primary?.team?.id ?? null,
    club_name: primary?.team?.name ?? null,
    club_logo_url: primary?.team?.logo ?? null,
    club_country: primary?.league?.country ?? null,
    stats_club_season: totals,
    career_clubs: buildCareer(transfers),
    updated_at: new Date().toISOString(),
  };
}

function mapStanding(entry: AFStandingEntry, groupCode: string, teamId: number) {
  return {
    group_code: groupCode,
    team_id: teamId,
    rank: entry.rank,
    played: entry.all.played,
    won: entry.all.win,
    drawn: entry.all.draw,
    lost: entry.all.lose,
    goals_for: entry.all.goals.for,
    goals_against: entry.all.goals.against,
    goal_difference: entry.goalsDiff,
    points: entry.points,
    form: entry.form,
    updated_at: new Date().toISOString(),
  };
}

// ---------- seed steps ----------

// Seeds teams from football-data, assigning group_code from the fixtures draw.
export async function seedTeams(log: Logger = noop): Promise<number[]> {
  const db = getServerSupabase();
  log("Fetching WC 2026 teams (football-data.org)...");
  const [teamsRes, matchesRes] = await Promise.all([fetchWCTeams(), fetchWCMatches()]);
  const groups = deriveGroups(matchesRes.matches);

  const rows = teamsRes.teams.map((t) => mapFDTeam(t, groups.get(t.id) ?? null));
  if (rows.length === 0) {
    log("No teams returned (the WC 2026 draw may not be published yet).");
    return [];
  }
  const { error } = await db.from("teams").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`teams upsert failed: ${error.message}`);
  const assigned = rows.filter((r) => r.group_code).length;
  log(`Upserted ${rows.length} teams (${assigned} with a group assigned).`);
  return rows.map((r) => r.id);
}

// Seeds fixtures from football-data.
export async function seedFixtures(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Fetching WC 2026 fixtures (football-data.org)...");
  const { matches } = await fetchWCMatches();
  const rows = matches.map(mapFDMatch);
  if (rows.length === 0) {
    log("No fixtures returned yet.");
    return;
  }
  const { error } = await db.from("matches").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`matches upsert failed: ${error.message}`);
  log(`Upserted ${rows.length} fixtures.`);
}

// ---------- football-data <-> API-Football team crosswalk ----------

// Our teams table is seeded from football-data (and matches/venues are keyed to
// those ids), but players come from API-Football, which uses different team ids.
// Both feeds cover the identical 48 nations, so we crosswalk by normalized
// country name. normalize() strips case/accents/punctuation; ALIASES collapses
// the handful of naming differences between the two sources onto one key.
const TEAM_ALIASES: Record<string, string> = {
  unitedstates: "usa",
  czechrepublic: "czechia",
  turkiye: "turkey",
  bosnia: "bosniaherzegovina",
};

function teamKey(name: string): string {
  // NFD splits accented letters into base + combining mark; [^a-z] then drops the
  // marks (and spaces/punctuation), so "Türkiye" -> "turkiye", "Côte" -> "cote".
  const s = name.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
  return TEAM_ALIASES[s] ?? s;
}

interface TeamPair {
  fdId: number;
  afId: number;
  name: string;
}

// Resolves our football-data teams to API-Football team ids by normalized name.
// Returns both the matched pairs and an af-id -> fd-id lookup (used by standings,
// whose API-Football team ids must be translated to satisfy our FK to teams.id).
async function buildTeamCrosswalk(
  log: Logger,
): Promise<{ pairs: TeamPair[]; fdByAf: Map<number, number> }> {
  const db = getServerSupabase();
  const afTeams = await fetchTeams();
  const afByKey = new Map(afTeams.map((t) => [teamKey(t.team.name), t.team.id]));
  const { data: ourTeams, error } = await db.from("teams").select("id,name");
  if (error) throw new Error(`teams lookup failed: ${error.message}`);
  const pairs: TeamPair[] = [];
  const unmatched: string[] = [];
  for (const t of ourTeams ?? []) {
    const afId = afByKey.get(teamKey(t.name as string));
    if (afId) pairs.push({ fdId: t.id as number, afId, name: t.name as string });
    else unmatched.push(t.name as string);
  }
  log(`Matched ${pairs.length}/${(ourTeams ?? []).length} teams to API-Football.`);
  if (unmatched.length) log(`  UNMATCHED (skipped): ${unmatched.join(", ")}`);
  return { pairs, fdByAf: new Map(pairs.map((p) => [p.afId, p.fdId])) };
}

// A Supabase select() returns at most 1000 rows by default; page through with
// .range() so id sweeps (stale-row cleanup, resume checks) see the whole table.
type IdQuery = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: { id: number }[] | null; error: { message: string } | null }>;
};

async function allRowIds(makeQuery: () => IdQuery): Promise<number[]> {
  const PAGE = 1000;
  const out: number[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) out.push(r.id);
    if (rows.length < PAGE) break;
  }
  return out;
}

// Seeds players from API-Football for every team in our teams table.
// Pipeline: build the fd->af team crosswalk, pull all 48 squads, drop any stale
// player rows no longer in a squad, upsert base rows, then enrich each player
// with detail (bio + club season stats) and transfers (career history).
// Resumable: enrichment skips players that already have career data, so an
// interrupted run continues where it left off.
export async function seedPlayersFromApiFootball(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();

  // 1) Crosswalk our (football-data-keyed) teams to API-Football team ids.
  log("Building football-data <-> API-Football team crosswalk...");
  const { pairs: crosswalk } = await buildTeamCrosswalk(log);
  if (crosswalk.length === 0) {
    log("No teams matched — run the teams step first.");
    return;
  }

  // 2) Pull every squad. Each squad slot carries jersey #, position, photo, age,
  //    tied to the football-data team id via the crosswalk.
  type Slot = { sp: AFSquadPlayer; fdTeamId: number };
  const slots: Slot[] = [];
  for (const c of crosswalk) {
    await sleep(RATE_LIMIT_MS);
    try {
      const squads = await fetchSquad(c.afId);
      const players = squads[0]?.players ?? [];
      log(`  ${c.name}: ${players.length} players.`);
      for (const sp of players) slots.push({ sp, fdTeamId: c.fdId });
    } catch (e) {
      log(`  ${c.name}: squad fetch failed: ${(e as Error).message}`);
    }
  }
  if (slots.length === 0) {
    log("No squad data returned from API-Football.");
    return;
  }
  // De-dupe (a player can appear in only one squad, but guard anyway).
  const slotById = new Map<number, Slot>();
  for (const s of slots) slotById.set(s.sp.id, s);
  const afIds = new Set(slotById.keys());
  log(`Collected ${afIds.size} players across ${crosswalk.length} squads.`);

  // 3) Clean: remove stale rows (e.g. the previous football-data-sourced players,
  //    which used different ids) so the table reflects the API-Football squads.
  const existingIds = await allRowIds(() => db.from("players").select("id"));
  const stale = existingIds.filter((id) => !afIds.has(id));
  if (stale.length) {
    for (let i = 0; i < stale.length; i += 200) {
      const chunk = stale.slice(i, i + 200);
      const { error } = await db.from("players").delete().in("id", chunk);
      if (error) log(`  stale delete failed: ${error.message}`);
    }
    log(`Removed ${stale.length} stale player rows (old football-data ids).`);
  }

  // 4) Upsert base rows first so squad data survives even if enrichment is cut
  //    short. Base rows carry only squad-derived fields, so this never clobbers
  //    enrichment (club/stats/career) written by a prior run.
  const baseRows = [...slotById.values()].map(({ sp, fdTeamId }) => ({
    id: sp.id,
    name: sp.name,
    team_id: fdTeamId,
    position: sp.position,
    age: sp.age,
    jersey_number: sp.number,
    photo_url: sp.photo,
    updated_at: new Date().toISOString(),
  }));
  const { error: baseErr } = await db.from("players").upsert(baseRows, { onConflict: "id" });
  if (baseErr) throw new Error(`players base upsert failed: ${baseErr.message}`);
  log(`Upserted ${baseRows.length} base players. Enriching (detail + transfers)...`);

  // 5) Resume support: skip players that already have career data from a prior run.
  const done = new Set(
    await allRowIds(() => db.from("players").select("id").not("career_clubs", "is", null)),
  );
  const todo = [...slotById.values()].filter(({ sp }) => !done.has(sp.id));
  log(`Enrichment: ${done.size} already enriched (skipping), ${todo.length} remaining.`);

  // 6) Enrich each remaining player: player detail (bio + 2025/26 club stats)
  //    and transfer history (career timeline).
  let processed = 0;
  let withClub = 0;
  let withCareer = 0;
  let failed = 0;
  for (const { sp, fdTeamId } of todo) {
    processed++;
    try {
      await sleep(RATE_LIMIT_MS);
      const detail = await fetchPlayer(sp.id, CLUB_SEASON);
      await sleep(RATE_LIMIT_MS);
      const transfers = await fetchTransfers(sp.id);

      const p = detail[0];
      const row = p
        ? mapPlayer(p, transfers, fdTeamId, sp)
        : {
            id: sp.id,
            name: sp.name,
            team_id: fdTeamId,
            position: sp.position,
            age: sp.age,
            jersey_number: sp.number,
            photo_url: sp.photo,
            career_clubs: buildCareer(transfers),
            updated_at: new Date().toISOString(),
          };
      if ("club_name" in row && row.club_name) withClub++;
      if (row.career_clubs) withCareer++;

      const { error } = await db.from("players").upsert(row, { onConflict: "id" });
      if (error) log(`  player ${sp.id} (${sp.name}) upsert failed: ${error.message}`);
    } catch (e) {
      failed++;
      log(`  player ${sp.id} (${sp.name}) failed: ${(e as Error).message}`);
    }

    if (processed % 50 === 0) {
      log(`  ...${processed}/${todo.length} enriched (clubs ${withClub}, careers ${withCareer}).`);
    }
  }

  // Coverage across the whole squad set (not just this run), so re-runs show
  // cumulative progress.
  const { count: total } = await db.from("players").select("*", { count: "exact", head: true });
  const { count: photos } = await db
    .from("players")
    .select("*", { count: "exact", head: true })
    .not("photo_url", "is", null);
  const { count: clubs } = await db
    .from("players")
    .select("*", { count: "exact", head: true })
    .not("club_name", "is", null);
  const { count: careers } = await db
    .from("players")
    .select("*", { count: "exact", head: true })
    .not("career_clubs", "is", null);
  const denom = total ?? baseRows.length;
  const pct = (n: number | null) => `${n ?? 0} (${Math.round(((n ?? 0) / denom) * 100)}%)`;
  log(`This run: processed ${todo.length} | new clubs ${withClub} | new careers ${withCareer} | failed ${failed}.`);
  log(`Coverage now: ${denom} players | photos ${pct(photos)} | clubs ${pct(clubs)} | careers ${pct(careers)}.`);
}

export async function seedStandings(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Fetching group standings (API-Football)...");
  const standings = await fetchStandings();
  const league = standings[0]?.league;
  if (!league) {
    log("No standings returned yet.");
    return;
  }
  // Standings carry API-Football team ids; translate them to our football-data
  // ids via the crosswalk so they satisfy the standings.team_id -> teams.id FK.
  // Unmatched entries are skipped rather than crashing the upsert.
  const { fdByAf } = await buildTeamCrosswalk(log);
  const rows = league.standings.flatMap((group) =>
    group.flatMap((entry) => {
      const fdId = fdByAf.get(entry.team.id);
      if (!fdId) return [];
      const code = entry.group?.replace(/^Group\s+/i, "").trim() || "?";
      return [mapStanding(entry, code, fdId)];
    }),
  );
  if (rows.length === 0) {
    log("No standings rows (no teams matched the crosswalk).");
    return;
  }
  const { error } = await db
    .from("standings")
    .upsert(rows, { onConflict: "group_code,team_id" });
  if (error) throw new Error(`standings upsert failed: ${error.message}`);
  log(`Upserted ${rows.length} standings rows.`);
}

export interface SeedOptions {
  teams?: boolean;
  players?: boolean;
  fixtures?: boolean;
  standings?: boolean;
}

export async function runSeed(
  opts: SeedOptions = { teams: true, players: true, fixtures: true, standings: true },
  log: Logger = noop,
): Promise<void> {
  if (opts.teams) await seedTeams(log);
  if (opts.fixtures) await seedFixtures(log);
  if (opts.players) await seedPlayersFromApiFootball(log);
  if (opts.standings) await seedStandings(log);
  log("Seed complete.");
}
