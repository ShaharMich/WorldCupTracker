import { StandingsTable } from "@/components/groups/StandingsTable";
import { SetupNotice } from "@/components/EmptyState";
import { getStandings, getTeamsByGroup } from "@/lib/queries";
import type { StandingWithTeam } from "@/types/match";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Groups",
  description: "All 12 group standings for the FIFA World Cup 2026, updated after each match.",
  path: "/groups",
});
export const revalidate = 1800;

export default async function GroupsPage() {
  const [standings, teamsByGroup] = await Promise.all([
    getStandings(),
    getTeamsByGroup(),
  ]);

  // Prefer standings; fall back to team list (pre-tournament, before any results).
  const groupCodes = new Set<string>([
    ...standings.keys(),
    ...[...teamsByGroup.keys()].filter((k) => k !== "?"),
  ]);
  const codes = [...groupCodes].sort();

  if (codes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Group Standings</h1>
        <SetupNotice />
      </div>
    );
  }

  function rowsFor(code: string): StandingWithTeam[] {
    const existing = standings.get(code);
    if (existing && existing.length > 0) return existing;
    // Pre-tournament placeholder rows from the team list.
    const teams = teamsByGroup.get(code) ?? [];
    return teams.map((team, i) => ({
      id: -1,
      group_code: code,
      team_id: team.id,
      rank: i + 1,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      form: null,
      updated_at: "",
      team,
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Group Standings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Top 2 advance (green) · best 3rd-place teams qualify (yellow).
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {codes.map((code) => (
          <StandingsTable key={code} groupCode={code} rows={rowsFor(code)} />
        ))}
      </div>
    </div>
  );
}
