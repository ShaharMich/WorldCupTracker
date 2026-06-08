import { MatchList } from "@/components/matches/MatchList";
import { SetupNotice } from "@/components/EmptyState";
import { getAllMatches } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Schedule",
  description:
    "Every fixture and result at the FIFA World Cup 2026 — filter by round, day, team or live status.",
  path: "/matches",
});
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
