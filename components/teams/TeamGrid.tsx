import { TeamCard } from "@/components/teams/TeamCard";
import type { Team } from "@/types/team";

export function TeamGrid({ groups }: { groups: Map<string, Team[]> }) {
  const keys = [...groups.keys()].sort();
  return (
    <div className="space-y-8">
      {keys.map((code) => (
        <section key={code}>
          <h2 className="mb-3 text-lg font-semibold">
            {code === "?" ? "Unassigned" : `Group ${code}`}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {groups.get(code)!.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
