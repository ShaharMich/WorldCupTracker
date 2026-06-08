import { config } from "dotenv";
config({ path: ".env.local" });

import { getServerSupabase } from "@/lib/supabase/server";
import { fetchTransfers } from "@/lib/api/api-football";
import { buildCareer } from "@/lib/seed";
import { sleep } from "@/lib/utils";
import type { CareerClub } from "@/types/player";

// Fills in missing previous clubs for likely-incomplete careers: players whose
// stored career has a single entry and who are under 28 (young enough that one
// club is suspicious). For each, re-derive the career from API-Football transfers
// via the shared buildCareer — which now also appends the origin club (the `out`
// side of the earliest move) that single-transfer players were missing. Only
// writes when it produces more entries than are stored.
// Also hardcodes Oscar Bobb with his exact Manchester City (2022–2026) range.

const RATE_LIMIT_MS = 150;

const HARDCODE: Record<number, { name: string; career: CareerClub[] }> = {
  278133: {
    name: "Oscar Bobb",
    career: [
      { club: "Fulham", season: "2026–", appearances: null, goals: null },
      { club: "Manchester City", season: "2022–2026", appearances: null, goals: null },
    ],
  },
};

interface Row {
  id: number;
  name: string;
  age: number | null;
  career_clubs: CareerClub[] | null;
}

async function main() {
  const db = getServerSupabase();

  const all: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("players")
      .select("id,name,age,career_clubs")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data as Row[]) ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }

  const targets = all.filter(
    (p) =>
      !HARDCODE[p.id] &&
      Array.isArray(p.career_clubs) &&
      p.career_clubs.length === 1 &&
      p.age != null &&
      p.age < 28,
  );
  console.log(`Loaded ${all.length} players; ${targets.length} single-entry & under 28 to check.`);

  let filled = 0;
  let unchanged = 0;
  let failed = 0;
  for (const p of targets) {
    await sleep(RATE_LIMIT_MS);
    try {
      const transfers = await fetchTransfers(p.id);
      const career = buildCareer(transfers);
      if (career && career.length > (p.career_clubs?.length ?? 0)) {
        const { error } = await db
          .from("players")
          .update({ career_clubs: career, updated_at: new Date().toISOString() })
          .eq("id", p.id);
        if (error) {
          failed++;
          console.error(`  ${p.name}: update failed: ${error.message}`);
        } else {
          filled++;
          console.log(`  ${p.name}: ${career.map((c) => `${c.club} ${c.season}`).join(" | ")}`);
        }
      } else {
        unchanged++;
      }
    } catch (e) {
      failed++;
      console.error(`  ${p.name}: ${(e as Error).message}`);
    }
  }
  console.log(`Filled ${filled} careers; ${unchanged} unchanged; ${failed} failed.`);

  for (const [id, { name, career }] of Object.entries(HARDCODE)) {
    const { error } = await db
      .from("players")
      .update({ career_clubs: career, updated_at: new Date().toISOString() })
      .eq("id", Number(id));
    if (error) console.error(`  hardcode failed for ${name}: ${error.message}`);
    else console.log(`Hardcoded career for ${name}.`);
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("fix-missing-careers failed:", err);
    process.exit(1);
  });
