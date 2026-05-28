import type { Metadata } from "next";
import { TeamGrid } from "@/components/teams/TeamGrid";
import { SetupNotice } from "@/components/EmptyState";
import { getTeamsByGroup } from "@/lib/queries";

export const metadata: Metadata = { title: "Teams" };
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
