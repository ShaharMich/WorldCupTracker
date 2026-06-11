import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { MatchDetail } from "@/components/matches/MatchDetail";
import { getMatch } from "@/lib/queries";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  const match = await getMatch(Number(matchId));
  if (!match) return { title: "Match" };
  const home = match.home_team?.name ?? "Home";
  const away = match.away_team?.name ?? "Away";
  return { title: `${home} vs ${away}` };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const id = Number(matchId);
  if (!Number.isFinite(id)) notFound();

  const match = await getMatch(id);
  if (!match) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <BackButton />
      <MatchDetail initial={match} />
    </div>
  );
}
