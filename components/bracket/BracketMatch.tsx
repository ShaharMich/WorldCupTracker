import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { formatKickoff } from "@/lib/utils";
import { isFinishedStatus, type MatchWithTeams } from "@/types/match";

function Slot({
  team,
  goals,
  winner,
}: {
  team: MatchWithTeams["home_team"];
  goals: number | null;
  winner: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-2 px-2.5 py-1.5 " +
        (winner ? "text-foreground" : "text-muted-foreground")
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        {team ? (
          <TeamBadge team={team} size={18} />
        ) : (
          <span className="grid size-[18px] place-items-center rounded-full bg-secondary text-[9px] font-bold text-muted-foreground">
            ?
          </span>
        )}
        <span className="truncate text-xs font-semibold">{team?.name ?? "TBD"}</span>
      </div>
      {goals != null ? (
        <span className="tabular-nums text-xs font-bold">{goals}</span>
      ) : null}
    </div>
  );
}

export function BracketMatch({ match }: { match: MatchWithTeams }) {
  const finished = isFinishedStatus(match.status);
  const hasScore = match.home_score != null && match.away_score != null;
  const homeWin = hasScore && finished && match.home_score! > match.away_score!;
  const awayWin = hasScore && finished && match.away_score! > match.home_score!;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block w-56 overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:border-primary/60 hover:shadow-md hover:shadow-primary/10"
    >
      <div className="divide-y divide-border">
        <Slot team={match.home_team} goals={hasScore ? match.home_score : null} winner={!awayWin} />
        <Slot team={match.away_team} goals={hasScore ? match.away_score : null} winner={!homeWin} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-2.5 py-1 text-[10px] text-muted-foreground">
        <span className="truncate">{match.city ?? match.venue ?? "Venue TBD"}</span>
        <span className="shrink-0">{formatKickoff(match.kickoff_utc)}</span>
      </div>
    </Link>
  );
}
