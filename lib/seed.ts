import { getServerSupabase } from "@/lib/supabase/server";
import {
  fetchTeams,
  fetchSquad,
  fetchPlayer,
  fetchTransfers,
  fetchCoaches,
  fetchStandings,
  fetchFixtures,
  fetchFixturePlayers,
  CLUB_SEASON,
} from "@/lib/api/api-football";
import {
  fetchWCTeams,
  fetchWCMatches,
  type FDTeam,
  type FDMatch,
} from "@/lib/api/football-data";
import { venueForMatch } from "@/lib/venues";
import { fifaRankFor } from "@/lib/fifa-rankings";
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
export function aggregateClubSeason(p: AFPlayerResponse) {
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

// Normalized club name for de-duping (case/accents/punctuation insensitive), so
// "Fenerbahce" and "Fenerbahçe" collapse to one entry.
function clubKey(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
}

// Standardizes career `season` fields to consistent year ranges. Input is a
// newest-first list whose `season` holds at least a start year (a bare "2021" or
// an existing range like "2004–2021"). Each club's end year is the start year of
// the next (newer) club — i.e. when the player left it. The current club (index
// 0) and any club with no known successor year render open-ended ("2023–").
// Uses an en dash (–) throughout.
export function withSeasonRanges<T extends { season: string }>(career: T[]): T[] {
  const startYear = (s: string) => s.match(/\d{4}/)?.[0] ?? "";
  return career.map((c, i) => {
    const start = startYear(c.season);
    if (!start) return { ...c, season: "" };
    const end = i > 0 ? startYear(career[i - 1].season) : "";
    return { ...c, season: end ? `${start}–${end}` : `${start}–` };
  });
}

// Builds a career timeline (newest first) from transfer history. Per-club
// appearance/goal totals aren't available from /transfers, so they stay null;
// the UI renders the club + year and omits the counts when null. Consecutive
// entries for the same club (e.g. a loan that became permanent, or duplicate
// feed rows) are collapsed to a single entry keeping the most recent year.
export function buildCareer(transfers: AFTransferResponse[]) {
  const moves = (transfers[0]?.transfers ?? []).filter((m) => m.teams.in?.name);
  if (moves.length === 0) return null;
  const sortedMoves = moves
    .slice()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")); // newest first

  const inClubs = sortedMoves.map((m) => ({
    club: m.teams.in!.name as string,
    season: m.date ? m.date.slice(0, 4) : "",
    appearances: null as number | null,
    goals: null as number | null,
  }));

  // Collapse consecutive duplicate clubs (loan→permanent, duplicate feed rows).
  const deduped: typeof inClubs = [];
  for (const c of inClubs) {
    const prev = deduped[deduped.length - 1];
    if (prev && clubKey(prev.club) === clubKey(c.club)) continue; // keep newest
    deduped.push(c);
  }
  const career = withSeasonRanges(deduped);

  // Transfers only record the clubs a player moved INTO, so the club they came up
  // through (the `out` side of their earliest move) is otherwise missing — this is
  // why single-transfer players lose their origin club. Append it: the end year is
  // known (when they left), the start year isn't, so it renders open ("–2026").
  const oldest = sortedMoves[sortedMoves.length - 1];
  const origin = oldest.teams.out?.name;
  const last = career[career.length - 1];
  if (origin && (!last || clubKey(last.club) !== clubKey(origin))) {
    const endYear = oldest.date ? oldest.date.slice(0, 4) : "";
    career.push({ club: origin, season: endYear ? `–${endYear}` : "", appearances: null, goals: null });
  }
  return career.length > 0 ? career : null;
}

// The player's most recent transfer destination (with team id + logo), used to
// correct the current club when the stats-derived club lags behind a recent move.
function latestMove(transfers: AFTransferResponse[]): AFTransferResponse["transfers"][number] | null {
  const moves = (transfers[0]?.transfers ?? []).filter((m) => m.teams.in?.name);
  if (moves.length === 0) return null;
  return moves.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
}

export interface CurrentClub {
  club_id: number | null;
  club_name: string | null;
  club_logo_url: string | null;
  club_country: string | null;
}

// Resolves a player's current club (id, name, logo, country) from their stats
// primary club, overridden by a more recent transfer. Shared by mapPlayer (seed)
// and the logo-repair script so both stay in lockstep.
export function currentClubFrom(
  primary: ReturnType<typeof aggregateClubSeason>["primary"],
  transfers: AFTransferResponse[],
): CurrentClub {
  let club_id = primary?.team?.id ?? null;
  let club_name = primary?.team?.name ?? null;
  let club_logo_url = primary?.team?.logo ?? null;
  let club_country = primary?.league?.country ?? null;

  // If the most recent transfer is to a different club and is at least as recent
  // as the stats season we pulled (CLUB_SEASON), trust the transfer — this catches
  // mid-season moves whose minutes haven't yet overtaken the former club. Require
  // the transfer destination to carry a logo: the feed sometimes lists a name
  // variant of the same club (e.g. "Internazionale" vs the senior "Inter") with a
  // null logo, and overriding with that would blank out the correct primary logo.
  const latest = latestMove(transfers);
  if (latest && latest.teams.in?.name && latest.teams.in.logo) {
    const year = latest.date ? Number(latest.date.slice(0, 4)) : null;
    if (latest.teams.in.id !== club_id && year != null && year >= CLUB_SEASON) {
      club_id = latest.teams.in.id;
      club_name = latest.teams.in.name;
      club_logo_url = latest.teams.in.logo;
      club_country = null; // /transfers carries no country
    }
  }
  return { club_id, club_name, club_logo_url, club_country };
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
  const club = currentClubFrom(primary, transfers);

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
    club_id: club.club_id,
    club_name: club.club_name,
    club_logo_url: club.club_logo_url,
    club_country: club.club_country,
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

// Crosswalks our football-data fixtures to API-Football fixture ids and stores
// each on matches.af_fixture_id, so live refresh (events/stats/lineups) can fetch
// the right fixture. Both feeds cover the same 104 games but use unrelated
// fixture ids; we match on the (unordered) team pair, disambiguating with the
// kickoff date when a pair recurs. Knockout fixtures whose teams aren't drawn yet
// (null team ids on either side) are skipped — re-run after each round is set.
export async function seedFixtureCrosswalk(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Crosswalking fixtures to API-Football ids...");

  // af team id -> our (football-data) team id, so we can translate AF fixtures.
  const { fdByAf } = await buildTeamCrosswalk(log);

  const { data: ourMatches, error } = await db
    .from("matches")
    .select("id,home_team_id,away_team_id,kickoff_utc");
  if (error) throw new Error(`matches lookup failed: ${error.message}`);

  // Key our matches by unordered fd team pair; a pair can recur (group + a later
  // knockout), so keep a list and disambiguate by date below.
  const pairKey = (a: number, b: number) => [a, b].sort((x, y) => x - y).join("-");
  const day = (iso: string) => iso.slice(0, 10);
  const byPair = new Map<string, { id: number; date: string }[]>();
  for (const m of ourMatches ?? []) {
    if (m.home_team_id == null || m.away_team_id == null) continue;
    const k = pairKey(m.home_team_id, m.away_team_id);
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k)!.push({ id: m.id as number, date: day(m.kickoff_utc as string) });
  }

  const fixtures = await fetchFixtures();
  const updates: { id: number; af_fixture_id: number }[] = [];
  let unresolvedTeams = 0;
  let noMatch = 0;
  for (const f of fixtures) {
    const homeFd = fdByAf.get(f.teams.home.id);
    const awayFd = fdByAf.get(f.teams.away.id);
    if (homeFd == null || awayFd == null) {
      unresolvedTeams++;
      continue; // a placeholder/unknown team — can't map yet
    }
    const candidates = byPair.get(pairKey(homeFd, awayFd)) ?? [];
    const chosen =
      candidates.length === 1
        ? candidates[0]
        : candidates.find((c) => c.date === day(f.fixture.date));
    if (!chosen) {
      noMatch++;
      continue;
    }
    updates.push({ id: chosen.id, af_fixture_id: f.fixture.id });
  }

  // Update one row at a time (a bulk upsert would need every NOT NULL column).
  let written = 0;
  for (const u of updates) {
    const { error: upErr } = await db
      .from("matches")
      .update({ af_fixture_id: u.af_fixture_id, updated_at: new Date().toISOString() })
      .eq("id", u.id);
    if (upErr) log(`  match ${u.id} af id update failed: ${upErr.message}`);
    else written++;
  }
  log(
    `Mapped ${written}/${fixtures.length} fixtures to AF ids ` +
      `(skipped ${unresolvedTeams} with undrawn teams, ${noMatch} with no local match).`,
  );
}

// Seeds each team's current FIFA world ranking from the hardcoded catalog
// (lib/fifa-rankings.ts) — API-Football has no FIFA-ranking endpoint. Matches by
// team name; teams without a catalog entry keep a null rank (no badge shown).
// Re-run after FIFA publishes a new monthly list (update the catalog first).
export async function seedFifaRankings(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Seeding FIFA world rankings (hardcoded catalog)...");
  const { data, error } = await db.from("teams").select("id,name");
  if (error) throw new Error(`teams lookup failed: ${error.message}`);
  const teams = data ?? [];
  if (teams.length === 0) {
    log("No teams in the table — run the teams step first.");
    return;
  }

  const unmatched: string[] = [];
  const rows = teams.flatMap((t) => {
    const rank = fifaRankFor(t.name as string);
    if (rank == null) {
      unmatched.push(t.name as string);
      return [];
    }
    // Carry `name` so the upsert's INSERT path satisfies the NOT NULL column;
    // on the (always-taken) UPDATE path only fifa_rank/updated_at change.
    return [{ id: t.id as number, name: t.name as string, fifa_rank: rank, updated_at: new Date().toISOString() }];
  });

  if (rows.length) {
    const { error: upErr } = await db.from("teams").upsert(rows, { onConflict: "id" });
    if (upErr) throw new Error(`fifa_rank upsert failed: ${upErr.message}`);
  }
  log(`Set FIFA rank on ${rows.length}/${teams.length} teams.`);
  if (unmatched.length) log(`  No ranking in catalog for: ${unmatched.join(", ")}`);
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

// Seeds each team's current head coach (name, photo, nationality) from
// API-Football. Coaches are keyed by API-Football team id, so we go through the
// crosswalk and write onto our football-data-keyed teams rows.
export async function seedCoaches(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Seeding team coaches (API-Football)...");
  const { pairs } = await buildTeamCrosswalk(log);
  if (pairs.length === 0) {
    log("No teams matched — run the teams step first.");
    return;
  }

  let found = 0;
  let withPhoto = 0;
  for (const { fdId, afId, name } of pairs) {
    await sleep(RATE_LIMIT_MS);
    try {
      const coaches = await fetchCoaches(afId);
      // The current coach has a career entry for THIS team with no end date;
      // fall back to any current role, then to the first result.
      const current =
        coaches.find((c) =>
          (c.career ?? []).some((e) => e.team?.id === afId && e.end === null),
        ) ??
        coaches.find((c) => (c.career ?? []).some((e) => e.end === null)) ??
        coaches[0];
      if (!current) {
        log(`  ${name}: no coach listed.`);
        continue;
      }
      found++;
      if (current.photo) withPhoto++;
      const { error } = await db
        .from("teams")
        .update({
          coach_id: current.id,
          coach_name: current.name,
          coach_photo_url: current.photo,
          coach_nationality: current.nationality,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fdId);
      if (error) log(`  ${name}: update failed: ${error.message}`);
    } catch (e) {
      log(`  ${name}: coach fetch failed: ${(e as Error).message}`);
    }
  }
  log(`Coaches: ${found}/${pairs.length} teams have a coach (${withPhoto} with a photo).`);
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

// Aggregates each player's World Cup 2026 tournament stats from finished WC
// fixtures and writes them to players.stats_wc. Iterates API-Football fixtures
// directly (league=1, season=2026) so fixture + player ids stay in API-Football
// space — our players table is keyed by API-Football player id, so per-fixture
// stats map straight onto our rows (no crosswalk needed here). Idempotent:
// re-running after each match recomputes totals across all completed fixtures.
export async function seedWCPlayerStats(log: Logger = noop): Promise<void> {
  const db = getServerSupabase();
  log("Fetching WC 2026 fixtures (API-Football) for player stats...");
  const fixtures = await fetchFixtures();
  const finished = fixtures.filter((f) =>
    ["FT", "AET", "PEN"].includes(f.fixture.status.short),
  );
  log(`${finished.length}/${fixtures.length} fixtures finished.`);
  if (finished.length === 0) {
    log("No completed matches yet — nothing to aggregate.");
    return;
  }

  type Agg = {
    appearances: number;
    lineups: number;
    minutes: number;
    goals: number;
    assists: number;
    yellow: number;
    red: number;
    ratingSum: number;
    ratingMin: number;
  };
  const agg = new Map<number, Agg>();
  const get = (id: number): Agg => {
    let a = agg.get(id);
    if (!a) {
      a = { appearances: 0, lineups: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, ratingMin: 0 };
      agg.set(id, a);
    }
    return a;
  };

  for (const f of finished) {
    await sleep(RATE_LIMIT_MS);
    try {
      const entries = await fetchFixturePlayers(f.fixture.id);
      for (const entry of entries) {
        for (const p of entry.players) {
          const st = p.statistics?.[0];
          if (!st) continue;
          const mins = st.games?.minutes ?? 0;
          if (mins <= 0) continue; // unused subs have null/0 minutes — didn't play
          const a = get(p.player.id);
          a.appearances += 1;
          if (st.games?.substitute === false) a.lineups += 1;
          a.minutes += mins;
          a.goals += st.goals?.total ?? 0;
          a.assists += st.goals?.assists ?? 0;
          a.yellow += st.cards?.yellow ?? 0;
          a.red += st.cards?.red ?? 0;
          const r = st.games?.rating ? Number(st.games.rating) : NaN;
          if (Number.isFinite(r)) {
            a.ratingSum += r * mins;
            a.ratingMin += mins;
          }
        }
      }
    } catch (e) {
      log(`  fixture ${f.fixture.id} player stats failed: ${(e as Error).message}`);
    }
  }

  log(`Aggregated WC stats for ${agg.size} players. Writing to Supabase...`);
  let updated = 0;
  for (const [id, a] of agg) {
    const stats_wc = {
      appearances: a.appearances,
      lineups: a.lineups,
      minutes: a.minutes,
      goals: a.goals,
      assists: a.assists,
      yellow_cards: a.yellow,
      red_cards: a.red,
      rating: a.ratingMin > 0 ? (a.ratingSum / a.ratingMin).toFixed(2) : null,
    };
    const { error } = await db
      .from("players")
      .update({ stats_wc, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) log(`  player ${id} stats_wc update failed: ${error.message}`);
    else updated++;
  }
  log(`Updated stats_wc for ${updated} players.`);
}

export interface SeedOptions {
  teams?: boolean;
  players?: boolean;
  fixtures?: boolean;
  fixturemap?: boolean;
  coaches?: boolean;
  rankings?: boolean;
  standings?: boolean;
  wcstats?: boolean;
}

export async function runSeed(
  opts: SeedOptions = {
    teams: true,
    players: true,
    fixtures: true,
    fixturemap: true,
    coaches: true,
    rankings: true,
    standings: true,
    wcstats: true,
  },
  log: Logger = noop,
): Promise<void> {
  if (opts.teams) await seedTeams(log);
  if (opts.fixtures) await seedFixtures(log);
  if (opts.fixturemap) await seedFixtureCrosswalk(log);
  if (opts.rankings) await seedFifaRankings(log);
  if (opts.players) await seedPlayersFromApiFootball(log);
  if (opts.coaches) await seedCoaches(log);
  if (opts.standings) await seedStandings(log);
  if (opts.wcstats) await seedWCPlayerStats(log);
  log("Seed complete.");
}
