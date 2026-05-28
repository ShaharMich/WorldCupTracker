import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import type { Team } from "@/types/team";

export function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <TeamBadge team={team} size={32} />
      <div className="min-w-0">
        <p className="truncate font-medium">{team.name}</p>
        {team.confederation ? (
          <p className="text-xs text-muted-foreground">{team.confederation}</p>
        ) : null}
      </div>
    </Link>
  );
}
