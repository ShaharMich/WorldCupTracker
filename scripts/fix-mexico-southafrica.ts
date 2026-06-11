import { config } from "dotenv";
config({ path: ".env.local" });

import { getServerSupabase } from "@/lib/supabase/server";
import {
  fetchFixtures,
  fetchFixtureById,
  fetchFixtureEvents,
  fetchFixtureStatistics,
  fetchFixtureLineups,
} from "@/lib/api/api-football";
import { mapEvents, mapStats, mapLineups } from "@/lib/live";

// Our matches table is keyed by football-data ids; API-Football uses different
// fixture ids, so the live-refresh path (which calls fetchFixtureById with our
// id) never finds the opener. This one-off finds the Mexico vs South Africa
// fixture in API-Football by team name, pulls its events/stats/lineups, and
// writes them onto our matches row (the opener is id 537327, kept in sync with
// WC.openingMatchUtc in lib/constants.ts).
const OUR_MATCH_ID = 537327;

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
}

async function main() {
  const log = (m: string) => console.log(`[fix-opener] ${m}`);

  // 1) Locate the API-Football fixture for Mexico vs South Africa.
  log("Fetching WC 2026 fixtures (API-Football)...");
  const fixtures = await fetchFixtures();
  const wanted = new Set(["mexico", "southafrica"]);
  const fx = fixtures.find((f) => {
    const pair = new Set([norm(f.teams.home.name), norm(f.teams.away.name)]);
    return [...wanted].every((w) => pair.has(w));
  });
  if (!fx) {
    log("Could not find a Mexico vs South Africa fixture in API-Football.");
    process.exit(1);
  }
  const afId = fx.fixture.id;
  log(
    `Found AF fixture ${afId}: ${fx.teams.home.name} ${fx.goals.home ?? "-"}–${fx.goals.away ?? "-"} ${fx.teams.away.name} ` +
      `[status ${fx.fixture.status.short}, elapsed ${fx.fixture.status.elapsed ?? "-"}]`,
  );

  // 2) Pull the full match payload for that AF fixture id.
  const [detail, events, stats, lineups] = await Promise.all([
    fetchFixtureById(afId),
    fetchFixtureEvents(afId),
    fetchFixtureStatistics(afId),
    fetchFixtureLineups(afId),
  ]);
  const d = detail[0] ?? fx;
  const mappedEvents = mapEvents(events);
  const mappedStats = mapStats(stats);
  const mappedLineups = mapLineups(lineups);
  log(
    `Fetched: ${mappedEvents.length} events, ${mappedStats.length} stat rows, ${mappedLineups.length} lineups.`,
  );

  // 3) Write onto our football-data-keyed matches row.
  const db = getServerSupabase();
  const { data: existing, error: selErr } = await db
    .from("matches")
    .select("id")
    .eq("id", OUR_MATCH_ID)
    .maybeSingle();
  if (selErr) {
    log(`Lookup failed: ${selErr.message}`);
    process.exit(1);
  }
  if (!existing) {
    log(`Our matches row ${OUR_MATCH_ID} not found — run the fixtures seed first.`);
    process.exit(1);
  }

  const update = {
    status: d.fixture.status.short,
    elapsed: d.fixture.status.elapsed,
    home_score: d.goals.home,
    away_score: d.goals.away,
    home_score_ht: d.score.halftime?.home ?? null,
    away_score_ht: d.score.halftime?.away ?? null,
    home_score_et: d.score.extratime?.home ?? null,
    away_score_et: d.score.extratime?.away ?? null,
    home_score_pen: d.score.penalty?.home ?? null,
    away_score_pen: d.score.penalty?.away ?? null,
    events: mappedEvents.length > 0 ? mappedEvents : null,
    stats: mappedStats.length > 0 ? mappedStats : null,
    lineups: mappedLineups.length > 0 ? mappedLineups : null,
    updated_at: new Date().toISOString(),
  };
  const { error: upErr } = await db.from("matches").update(update).eq("id", OUR_MATCH_ID);
  if (upErr) {
    log(`Update failed: ${upErr.message}`);
    process.exit(1);
  }
  log(
    `Updated matches ${OUR_MATCH_ID}: status ${update.status}, score ${update.home_score ?? "-"}–${update.away_score ?? "-"}, ` +
      `events ${mappedEvents.length}, stats ${mappedStats.length}, lineups ${mappedLineups.length}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[fix-opener] failed:", e);
    process.exit(1);
  });
