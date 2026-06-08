import { config } from "dotenv";
config({ path: ".env.local" });

import { getServerSupabase } from "@/lib/supabase/server";
import { fetchPlayer, fetchTransfers, CLUB_SEASON } from "@/lib/api/api-football";
import { aggregateClubSeason, currentClubFrom } from "@/lib/seed";
import { sleep } from "@/lib/utils";

// Backfills club logos for players that have a club_name but no club_logo_url —
// e.g. rows whose club_name was corrected by fix-player-clubs.ts (which cleared
// the now-mismatched logo), plus any players whose enrichment never captured a
// logo (Akanji/Internazionale, Rieder/Augsburg, ...). Looking a logo up by name
// is unreliable (API-Football search surfaces U19/reserve sides and rejects
// names with accents/hyphens), so we recompute the club exactly like the seed:
// fetch the player's detail (season club stats) + transfers and run the shared
// currentClubFrom() resolver, which yields the correct senior-team id + logo.

const RATE_LIMIT_MS = 150;

async function main() {
  const db = getServerSupabase();

  const { data, error } = await db
    .from("players")
    .select("id,name,club_name")
    .not("club_name", "is", null)
    .is("club_logo_url", null)
    .order("id");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  console.log(`${rows.length} players have a club_name but no logo.`);

  let fixed = 0;
  let stillMissing = 0;
  let failed = 0;

  for (const row of rows) {
    await sleep(RATE_LIMIT_MS);
    try {
      const [detail, transfers] = await Promise.all([
        fetchPlayer(row.id as number, CLUB_SEASON),
        fetchTransfers(row.id as number),
      ]);
      const primary = detail[0] ? aggregateClubSeason(detail[0]).primary : null;
      const club = currentClubFrom(primary, transfers);

      if (!club.club_logo_url) {
        stillMissing++;
        continue;
      }

      const { error: upErr } = await db
        .from("players")
        .update({
          club_id: club.club_id,
          club_name: club.club_name,
          club_logo_url: club.club_logo_url,
          club_country: club.club_country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        failed++;
        console.error(`  ${row.name}: update failed: ${upErr.message}`);
      } else {
        fixed++;
        console.log(`  ${row.name}: ${row.club_name} -> ${club.club_name} (logo set)`);
      }
    } catch (e) {
      failed++;
      console.error(`  ${row.name}: ${(e as Error).message}`);
    }
  }

  console.log(`Done. logo set: ${fixed} | no logo found: ${stillMissing} | failed: ${failed}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("fix-club-logos failed:", err);
    process.exit(1);
  });
