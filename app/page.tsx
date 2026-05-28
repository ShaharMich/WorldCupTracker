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
      <section className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-gradient-to-b from-primary/5 to-card px-6 py-12 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          USA · Canada · Mexico
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">FIFA World Cup 2026</h1>
        <p className="max-w-xl text-muted-foreground">
          {WC.teams} teams · {WC.matches} matches · {WC.groups} groups. Kicks off
          June 11, 2026.
        </p>
        <CountdownTimer targetUtc={WC.openingMatchUtc} />
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/teams" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80">
            Browse Teams
          </Link>
          <Link href="/matches" className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Full Schedule
          </Link>
          <Link href="/groups" className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Group Standings
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
