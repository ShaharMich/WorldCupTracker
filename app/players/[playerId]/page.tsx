import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerHero } from "@/components/players/PlayerHero";
import { PlayerStats, NationalSummary } from "@/components/players/PlayerStats";
import { PlayerCareer } from "@/components/players/PlayerCareer";
import { getPlayer, getTeam } from "@/lib/queries";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  const player = await getPlayer(Number(playerId));
  return { title: player?.name ?? "Player" };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const id = Number(playerId);
  if (!Number.isFinite(id)) notFound();

  const player = await getPlayer(id);
  if (!player) notFound();

  const team = player.team_id ? await getTeam(player.team_id) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <PlayerHero player={player} team={team} />
      <PlayerStats stats={player.stats_club_season} title="Club Season (2025/26)" />
      {player.stats_wc ? (
        <PlayerStats stats={player.stats_wc} title="World Cup 2026" />
      ) : null}
      <NationalSummary player={player} />
      <PlayerCareer career={player.career_clubs} />
    </div>
  );
}
