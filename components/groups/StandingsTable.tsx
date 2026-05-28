import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { cn } from "@/lib/utils";
import type { StandingWithTeam } from "@/types/match";

export function StandingsTable({
  groupCode,
  rows,
}: {
  groupCode: string;
  rows: StandingWithTeam[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/50 px-3 py-2 font-semibold">
        Group {groupCode}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="px-2 py-1.5 text-left font-medium">#</th>
            <th className="px-2 py-1.5 text-left font-medium">Team</th>
            <th className="px-1 py-1.5 text-center font-medium">P</th>
            <th className="px-1 py-1.5 text-center font-medium">W</th>
            <th className="px-1 py-1.5 text-center font-medium">D</th>
            <th className="px-1 py-1.5 text-center font-medium">L</th>
            <th className="px-1 py-1.5 text-center font-medium">GD</th>
            <th className="px-2 py-1.5 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">
                No standings yet.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={r.team_id ?? i}
                className={cn(
                  "border-t border-border",
                  i < 2 && "bg-green-600/5",
                  i === 2 && "bg-yellow-500/5",
                )}
              >
                <td className="px-2 py-1.5 tabular-nums">{r.rank ?? i + 1}</td>
                <td className="px-2 py-1.5">
                  {r.team ? (
                    <Link
                      href={`/teams/${r.team.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <TeamBadge team={r.team} size={18} />
                      <span className="truncate">{r.team.name}</span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">TBD</span>
                  )}
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums">{r.played}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{r.won}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{r.drawn}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{r.lost}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">
                  {r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference}
                </td>
                <td className="px-2 py-1.5 text-center font-semibold tabular-nums">
                  {r.points}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
