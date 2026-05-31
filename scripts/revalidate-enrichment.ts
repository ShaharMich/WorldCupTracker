// Rebuilds TheSportsDB enrichment for every player with the soccer-sport filter.
// For each player the sport-filtered lookup yields one of three outcomes:
//   matched  -> write the (corrected) soccer photo/club
//   no-match -> clear any enrichment (was a wrong-sport namesake, or none) so
//               the UI falls back to the silhouette
//   error    -> SKIP, leaving the row untouched (a transient TheSportsDB failure
//               must never be mistaken for "no data" and wipe a good row)
//
// Processing all players both removes wrong-sport data AND restores legitimate
// soccer players. Safe to re-run; re-running picks up rows skipped on error.
import { config } from "dotenv";
config({ path: ".env.local" });

import { getServerSupabase } from "@/lib/supabase/server";
import { enrichPlayerChecked } from "@/lib/api/thesportsdb";
import { sleep } from "@/lib/utils";

// The free TheSportsDB "3" key has a rolling rate cap, so keep per-call spacing
// gentle and pause between rounds to let the window clear.
const TSDB_RATE_LIMIT_MS = 1500;
const BETWEEN_ROUNDS_MS = 90_000;
const MAX_ROUNDS = 15;
const log = (msg: string) => console.log(`[revalidate] ${msg}`);

type Row = { id: number; name: string; photo_url: string | null; club_name: string | null };

// Supabase caps a select at 1000 rows; page through so we cover all 1219.
async function fetchAllPlayers(enrichedOnly: boolean): Promise<Row[]> {
  const db = getServerSupabase();
  const out: Row[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    let q = db.from("players").select("id, name, photo_url, club_name").order("id");
    if (enrichedOnly) q = q.or("photo_url.not.is.null,club_name.not.is.null");
    const { data, error } = await q.range(from, from + page - 1);
    if (error) throw new Error(`lookup failed: ${error.message}`);
    const batch = (data ?? []) as Row[];
    out.push(...batch);
    if (batch.length < page) break;
  }
  return out;
}

async function main() {
  const db = getServerSupabase();

  // `enriched` mode re-checks only already-enriched rows — the set that can hold
  // wrong-sport data — so the run is small enough to finish under the rate cap.
  const enrichedOnly = process.argv.slice(2).includes("enriched");
  const rows = await fetchAllPlayers(enrichedOnly);
  log(
    `Re-validating ${rows.length} ${enrichedOnly ? "enriched " : ""}players ` +
      `against the soccer filter (retries rate-limited rows until none remain)...`,
  );

  let matched = 0;
  let cleared = 0;

  // Retry only the rows that errored (rate-limited); a definitive matched/no-match
  // answer removes a row from the queue. Pause between rounds so the rolling cap
  // resets. Verified-soccer rows are only ever re-confirmed, never lost.
  let pending = rows;
  let round = 0;
  while (pending.length > 0 && round < MAX_ROUNDS) {
    round++;
    const stillPending: Row[] = [];
    let roundMatched = 0;
    let roundCleared = 0;

    for (const row of pending) {
      await sleep(TSDB_RATE_LIMIT_MS);
      const outcome = await enrichPlayerChecked(row.name);

      if (outcome.status === "error") {
        stillPending.push(row);
      } else if (outcome.status === "matched") {
        const e = outcome.data;
        const { error: upErr } = await db
          .from("players")
          .update({
            photo_url: e.photo_url,
            club_id: e.club_id,
            club_name: e.club_name,
            club_logo_url: e.club_logo_url,
            club_country: e.club_country,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (upErr) log(`  update failed for ${row.name}: ${upErr.message}`);
        else {
          matched++;
          roundMatched++;
        }
      } else if (row.photo_url || row.club_name) {
        // no-match with existing data → clear the wrong-sport enrichment.
        const { error: clrErr } = await db
          .from("players")
          .update({
            photo_url: null,
            club_id: null,
            club_name: null,
            club_logo_url: null,
            club_country: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (clrErr) log(`  clear failed for ${row.name}: ${clrErr.message}`);
        else {
          cleared++;
          roundCleared++;
        }
      }
    }

    log(
      `Round ${round}: resolved ${pending.length - stillPending.length}/${pending.length} ` +
        `(matched ${roundMatched}, cleared ${roundCleared}), ${stillPending.length} still rate-limited.`,
    );
    pending = stillPending;
    if (pending.length > 0 && round < MAX_ROUNDS) {
      log(`  Waiting ${BETWEEN_ROUNDS_MS / 1000}s for the rate-limit window to clear...`);
      await sleep(BETWEEN_ROUNDS_MS);
    }
  }

  if (pending.length === 0) {
    log(`Done. All enriched rows verified | soccer kept/corrected ${matched} | wrong-sport cleared ${cleared}.`);
  } else {
    log(
      `Stopped after ${round} rounds with ${pending.length} rows still rate-limited ` +
        `(matched ${matched}, cleared ${cleared}). Re-run later to finish.`,
    );
    process.exitCode = 2;
  }

  const { count: total } = await db.from("players").select("*", { count: "exact", head: true });
  const { count: withPhoto } = await db
    .from("players")
    .select("*", { count: "exact", head: true })
    .not("photo_url", "is", null);
  const { count: withClub } = await db
    .from("players")
    .select("*", { count: "exact", head: true })
    .not("club_name", "is", null);
  log(`Coverage now: ${total} players | photos ${withPhoto} | clubs ${withClub}.`);
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("[revalidate] failed:", err);
    process.exit(1);
  });
