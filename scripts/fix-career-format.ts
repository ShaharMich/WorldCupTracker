import { config } from "dotenv";
config({ path: ".env.local" });

import { getServerSupabase } from "@/lib/supabase/server";
import { withSeasonRanges } from "@/lib/seed";
import type { CareerClub } from "@/types/player";

// Standardizes every player's career_clubs `season` to consistent year ranges
// ("2004–2021", current club "2023–") via the shared withSeasonRanges helper —
// the same transform the seed now applies. Also hardcodes Pedri, an academy
// product with no transfer rows in API-Football (career was null → "no year").
// Touches only career_clubs (never club_name/logo).

const HARDCODE: Record<number, { name: string; career: CareerClub[] }> = {
  // Pedri — La Masia route via Las Palmas; no transfer feed rows.
  133609: {
    name: "Pedri",
    career: [
      { club: "Barcelona", season: "2020–", appearances: null, goals: null },
      { club: "Las Palmas", season: "2019–2020", appearances: null, goals: null },
    ],
  },
};

interface Row {
  id: number;
  name: string;
  career_clubs: CareerClub[] | null;
}

function sameSeasons(a: CareerClub[], b: CareerClub[]): boolean {
  return a.length === b.length && a.every((c, i) => c.season === b[i].season);
}

async function main() {
  const db = getServerSupabase();

  const all: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("players")
      .select("id,name,career_clubs")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data as Row[]) ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  console.log(`Loaded ${all.length} players.`);

  let changed = 0;
  for (const row of all) {
    if (HARDCODE[row.id]) continue;
    if (!row.career_clubs || row.career_clubs.length === 0) continue;
    const ranged = withSeasonRanges(row.career_clubs);
    if (sameSeasons(row.career_clubs, ranged)) continue;
    const { error } = await db
      .from("players")
      .update({ career_clubs: ranged, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) console.error(`  ${row.name}: update failed: ${error.message}`);
    else changed++;
  }
  console.log(`Standardized career seasons for ${changed} players.`);

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
    console.error("fix-career-format failed:", err);
    process.exit(1);
  });
