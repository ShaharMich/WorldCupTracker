import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamBadge } from "@/components/TeamBadge";
import { SquadTable } from "@/components/teams/SquadTable";
import { StandingsTable } from "@/components/groups/StandingsTable";
import { MatchCard } from "@/components/matches/MatchCard";
import {
  getTeam,
  getSquad,
  getMatchesForTeam,
  getStandingsForGroup,
} from "@/lib/queries";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getTeam(Number(teamId));
  return { title: team?.name ?? "Team" };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const id = Number(teamId);
  if (!Number.isFinite(id)) notFound();

  const team = await getTeam(id);
  if (!team) notFound();

  const [squad, matches, standings] = await Promise.all([
    getSquad(id),
    getMatchesForTeam(id),
    team.group_code ? getStandingsForGroup(team.group_code) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <TeamBadge team={team} size={56} />
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-sm text-muted-foreground">
            {team.group_code ? `Group ${team.group_code}` : "Group TBD"}
            {team.confederation ? ` · ${team.confederation}` : ""}
            {team.wc_appearances != null ? ` · ${team.wc_appearances} WC appearances` : ""}
            {team.wc_titles ? ` · ${team.wc_titles} titles` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Squad</h2>
          <SquadTable players={squad} />
        </div>

        <div className="space-y-8">
          {team.group_code ? (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Group {team.group_code}</h2>
              <StandingsTable groupCode={team.group_code} rows={standings} />
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-xl font-semibold">Fixtures</h2>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No fixtures yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
