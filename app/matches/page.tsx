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
      <h1 className="mb-6 text-3xl font-bold">Schedule &amp; Results</h1>
      {matches.length === 0 ? <SetupNotice /> : <MatchList matches={matches} />}
    </div>
  );
}
