import { TeamGrid } from "@/components/teams/TeamGrid";
import { SetupNotice } from "@/components/EmptyState";
import { getTeamsByGroup } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Teams",
  description:
    "Browse all 48 national teams at the FIFA World Cup 2026 by group, with full squads, club stats and head coaches.",
  path: "/teams",
});
export const revalidate = 3600;

export default async function TeamsPage() {
  const groups = await getTeamsByGroup();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Teams</h1>
      {groups.size === 0 ? <SetupNotice /> : <TeamGrid groups={groups} />}
    </div>
  );
}
