import type { Metadata } from "next";
import { MatchList } from "@/components/matches/MatchList";
import { SetupNotice } from "@/components/EmptyState";
import { getAllMatches } from "@/lib/queries";

export const metadata: Metadata = { title: "Schedule" };
export const revalidate = 60;

export default async function MatchesPage() {
  const matches = await getAllMatches();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Schedule <span className="text-gradient-gold">&amp; Results</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All {matches.length || 104} fixtures across the tournament — filter by round, day or live status.
        </p>
      </div>
      {matches.length === 0 ? <SetupNotice /> : <MatchList matches={matches} />}
    </div>
  );
}
