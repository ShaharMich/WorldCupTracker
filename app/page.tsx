import Link from "next/link";
import { CountdownTimer } from "@/components/layout/CountdownTimer";
import { MatchCard } from "@/components/matches/MatchCard";
import { EmptyState } from "@/components/EmptyState";
import { WC } from "@/lib/constants";
import {
  getUpcomingMatches,
  getRecentResults,
  getLiveMatches,
  isConfigured,
} from "@/lib/queries";

export const revalidate = 60;

export default async function Home() {
  const [live, upcoming, recent] = await Promise.all([
    getLiveMatches(),
    getUpcomingMatches(5),
    getRecentResults(5),
  ]);
  const configured = isConfigured();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="wc-hero relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-primary/20 px-6 py-14 text-center shadow-xl shadow-navy-deep/40 sm:py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
          🇺🇸 USA · 🇨🇦 Canada · 🇲🇽 Mexico
        </span>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
          <span className="text-gradient-gold">FIFA World Cup</span>
          <span className="block text-foreground">2026</span>
        </h1>
        <p className="max-w-xl text-base text-white/80">
          {WC.teams} teams · {WC.matches} matches · {WC.groups} groups across three
          nations. The tournament kicks off June 11, 2026.
        </p>
        <CountdownTimer targetUtc={WC.openingMatchUtc} />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/teams" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105">
            Browse Teams
          </Link>
          <Link href="/bracket" className="rounded-full border border-primary/40 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">
            View Bracket
          </Link>
          <Link href="/matches" className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">
            Full Schedule
          </Link>
        </div>
      </section>

      {!configured ? (
        <div className="mt-8">
          <EmptyState
            title="Welcome — data not loaded yet"
            message="Add Supabase + API keys to .env.local, run supabase/schema.sql, then `npm run seed`. The full UI is ready and will populate automatically."
          />
        </div>
      ) : null}

      {live.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Live Now</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming</h2>
            <Link href="/matches" className="text-sm text-muted-foreground hover:underline">
              View all
            </Link>
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState message="Fixtures will appear once seeded." />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Results</h2>
            <Link href="/matches" className="text-sm text-muted-foreground hover:underline">
              View all
            </Link>
          </div>
          {recent.length > 0 ? (
            <div className="space-y-3">
              {recent.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState message="Results appear after matches kick off." />
          )}
        </section>
      </div>
    </div>
  );
}
