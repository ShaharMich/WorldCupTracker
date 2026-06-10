import { config } from "dotenv";
config({ path: ".env.local" });

import { runSeed, type SeedOptions } from "@/lib/seed";

// Usage:
//   npm run seed                      -> everything
//   npm run seed -- teams fixtures    -> only listed steps
const args = process.argv.slice(2);
const opts: SeedOptions =
  args.length === 0
    ? { teams: true, players: true, fixtures: true, coaches: true, rankings: true, standings: true, wcstats: true }
    : {
        teams: args.includes("teams"),
        players: args.includes("players"),
        fixtures: args.includes("fixtures"),
        coaches: args.includes("coaches"),
        rankings: args.includes("rankings"),
        standings: args.includes("standings"),
        wcstats: args.includes("wcstats"),
      };

const log = (msg: string) => console.log(`[seed] ${msg}`);

runSeed(opts, log)
  .then(() => {
    console.log("[seed] done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
