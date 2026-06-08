import { config } from "dotenv";
config({ path: ".env.local" });

import { getServerSupabase } from "@/lib/supabase/server";
import type { CareerClub } from "@/types/player";

// One-off data repair, mirroring the seed fixes in lib/seed.ts but applied to
// rows already in Supabase (so we don't have to re-run the full API seed):
//   1) Collapse consecutive duplicate clubs in career_clubs.
//   2) When the most recent career entry is newer than (and differs from) the
//      stored club_name, update club_name to that latest club.
//   3) Hardcode complete career histories for a few marquee players whose
//      transfer feed is obviously incomplete (Messi, Ronaldo, Yamal).

const CLUB_SEASON = 2025; // matches lib/api/api-football CLUB_SEASON (2025/26)

function clubKey(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
}

function dedupeCareer(career: CareerClub[]): CareerClub[] {
  const out: CareerClub[] = [];
  for (const c of career) {
    const prev = out[out.length - 1];
    if (prev && clubKey(prev.club) === clubKey(c.club)) continue; // keep newest
    out.push(c);
  }
  return out;
}

// Accurate, hand-curated histories (newest first) for stars with broken feeds.
const HARDCODE: Record<number, { name: string; career: CareerClub[] }> = {
  // Lionel Messi — Barcelona (2004–2021) was missing between PSG and the start.
  154: {
    name: "L. Messi",
    career: [
      { club: "Inter Miami", season: "2023", appearances: null, goals: null },
      { club: "Paris Saint Germain", season: "2021", appearances: null, goals: null },
      { club: "Barcelona", season: "2004–2021", appearances: null, goals: null },
    ],
  },
  // Cristiano Ronaldo — feed missed Sporting CP and the current Al-Nassr spell.
  874: {
    name: "Cristiano Ronaldo",
    career: [
      { club: "Al-Nassr", season: "2023–", appearances: null, goals: null },
      { club: "Manchester United", season: "2021–2022", appearances: null, goals: null },
      { club: "Juventus", season: "2018–2021", appearances: null, goals: null },
      { club: "Real Madrid", season: "2009–2018", appearances: null, goals: null },
      { club: "Manchester United", season: "2003–2009", appearances: null, goals: null },
      { club: "Sporting CP", season: "2002–2003", appearances: null, goals: null },
    ],
  },
  // Lamine Yamal — academy product with no transfer rows; only ever Barcelona.
  386828: {
    name: "Lamine Yamal",
    career: [{ club: "Barcelona", season: "2023–", appearances: null, goals: null }],
  },
};

interface Row {
  id: number;
  name: string;
  club_name: string | null;
  career_clubs: CareerClub[] | null;
}

async function main() {
  const db = getServerSupabase();

  // Page through every player (select() caps at 1000 rows).
  const all: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("players")
      .select("id,name,club_name,career_clubs")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data as Row[]) ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  console.log(`Loaded ${all.length} players.`);

  let deduped = 0;
  let clubFixed = 0;

  for (const row of all) {
    if (HARDCODE[row.id]) continue; // handled below
    if (!row.career_clubs || row.career_clubs.length === 0) continue;

    const updates: Record<string, unknown> = {};

    const cleaned = dedupeCareer(row.career_clubs);
    if (cleaned.length !== row.career_clubs.length) {
      updates.career_clubs = cleaned;
      deduped++;
    }

    // Latest entry is newest-first; correct club_name if it lags a recent move.
    const latest = cleaned[0];
    const latestYear = latest?.season ? Number(latest.season.slice(0, 4)) : NaN;
    if (
      latest &&
      row.club_name &&
      clubKey(latest.club) !== clubKey(row.club_name) &&
      Number.isFinite(latestYear) &&
      latestYear >= CLUB_SEASON
    ) {
      updates.club_name = latest.club;
      updates.club_id = null;
      updates.club_logo_url = null;
      updates.club_country = null;
      clubFixed++;
      console.log(`  club: ${row.name} — "${row.club_name}" -> "${latest.club}" (${latest.season})`);
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await db.from("players").update(updates).eq("id", row.id);
      if (error) console.error(`  update failed for ${row.name}: ${error.message}`);
    }
  }

  console.log(`Deduped career for ${deduped} players; corrected club_name for ${clubFixed}.`);

  // Hardcoded marquee careers.
  for (const [id, { name, career }] of Object.entries(HARDCODE)) {
    const { error } = await db
      .from("players")
      .update({ career_clubs: career, updated_at: new Date().toISOString() })
      .eq("id", Number(id));
    if (error) console.error(`  hardcode failed for ${name}: ${error.message}`);
    else console.log(`Hardcoded career for ${name} (${career.length} clubs).`);
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("fix-player-clubs failed:", err);
    process.exit(1);
  });
