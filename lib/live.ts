import { getServerSupabase } from "@/lib/supabase/server";
import { getCached } from "@/lib/cache";
import {
  fetchFixtureById,
  fetchFixtureEvents,
  fetchFixtureStatistics,
  fetchFixtureLineups,
} from "@/lib/api/api-football";
import { getMatch } from "@/lib/queries";
import { isLiveStatus } from "@/types/match";
import type { MatchWithTeams, MatchEvent, MatchStatItem, TeamLineup } from "@/types/match";
import type { AFFixtureEvent, AFFixtureStatistics, AFLineupEntry } from "@/types/api";

export function mapEvents(events: AFFixtureEvent[]): MatchEvent[] {
  return events.map((e) => ({
    type: e.type,
    team: e.team?.name ?? null,
    player: e.player?.name ?? null,
    assist: e.assist?.name ?? null,
    minute: e.time?.elapsed ?? null,
    extra: e.time?.extra ?? null,
    detail: e.detail ?? null,
  }));
}

export function mapStats(stats: AFFixtureStatistics[]): MatchStatItem[] {
  const home = stats[0]?.statistics ?? [];
  const away = stats[1]?.statistics ?? [];
  return home.map((s, i) => ({
    type: s.type,
    home: s.value,
    away: away[i]?.value ?? null,
  }));
}

export function mapLineups(lineups: AFLineupEntry[]): TeamLineup[] {
  return lineups.map((l) => ({
    team_id: l.team?.id ?? null,
    team_name: l.team?.name ?? null,
    formation: l.formation,
    coach: l.coach?.name ?? null,
    startXI: l.startXI.map((p) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      pos: p.player.pos,
      grid: p.player.grid,
    })),
    substitutes: l.substitutes.map((p) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      pos: p.player.pos,
      grid: p.player.grid,
    })),
  }));
}

// Pulls fresh fixture/events/stats/lineups for a match, persists them, and
// returns the merged record. Uses a 60s cache to respect rate limits.
//
// Our matches.id is a football-data id, but API-Football fixtures use unrelated
// ids — so we fetch by the crosswalked af_fixture_id stored on the row (seeded
// by the `fixturemap` step). Without it we can't reach the right fixture, so we
// return the cached record unchanged rather than querying with the wrong id.
export async function refreshMatch(id: number): Promise<MatchWithTeams | null> {
  const existing = await getMatch(id);
  if (!existing) return null;

  const afId = existing.af_fixture_id;
  if (afId == null) return existing;

  const [fixtures, events, stats, lineups] = await Promise.all([
    getCached(`af:fixture:${afId}`, () => fetchFixtureById(afId), 1),
    getCached(`af:events:${afId}`, () => fetchFixtureEvents(afId), 1),
    getCached(`af:stats:${afId}`, () => fetchFixtureStatistics(afId), 1),
    getCached(`af:lineups:${afId}`, () => fetchFixtureLineups(afId), 1),
  ]);

  const fx = fixtures[0];
  const mappedEvents = mapEvents(events);
  const mappedStats = mapStats(stats);
  const mappedLineups = mapLineups(lineups);

  const update = {
    status: fx?.fixture.status.short ?? existing.status,
    elapsed: fx?.fixture.status.elapsed ?? existing.elapsed,
    home_score: fx?.goals.home ?? existing.home_score,
    away_score: fx?.goals.away ?? existing.away_score,
    home_score_ht: fx?.score.halftime?.home ?? existing.home_score_ht,
    away_score_ht: fx?.score.halftime?.away ?? existing.away_score_ht,
    home_score_et: fx?.score.extratime?.home ?? existing.home_score_et,
    away_score_et: fx?.score.extratime?.away ?? existing.away_score_et,
    home_score_pen: fx?.score.penalty?.home ?? existing.home_score_pen,
    away_score_pen: fx?.score.penalty?.away ?? existing.away_score_pen,
    events: mappedEvents.length > 0 ? mappedEvents : existing.events,
    stats: mappedStats.length > 0 ? mappedStats : existing.stats,
    lineups: mappedLineups.length > 0 ? mappedLineups : existing.lineups,
    updated_at: new Date().toISOString(),
  };

  const db = getServerSupabase();
  await db.from("matches").update(update).eq("id", id);

  return { ...existing, ...update };
}

export { isLiveStatus };
