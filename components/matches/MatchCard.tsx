import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { LiveBadge } from "@/components/matches/LiveBadge";
import { formatKickoff, formatKickoffTime } from "@/lib/utils";
import { isLiveStatus, isFinishedStatus, type MatchWithTeams } from "@/types/match";

function score(m: MatchWithTeams) {
  if (m.home_score == null || m.away_score == null) return null;
  return `${m.home_score} - ${m.away_score}`;
}

function TeamRow({
  team,
  fallback,
  goals,
}: {
  team: MatchWithTeams["home_team"];
  fallback: string;
  goals: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <TeamBadge team={team} size={22} fallbackName={fallback} />
        <span className="truncate text-sm font-medium">
          {team?.name ?? fallback}
        </span>
      </div>
      {goals != null ? (
        <span className="tabular-nums text-sm font-bold">{goals}</span>
      ) : null}
    </div>
  );
}

export function MatchCard({ match }: { match: MatchWithTeams }) {
  const live = isLiveStatus(match.status);
  const finished = isFinishedStatus(match.status);
  const hasScore = score(match) != null;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">
          {match.stage}
          {match.group_code ? ` · Group ${match.group_code}` : ""}
        </span>
        {live ? (
          <LiveBadge elapsed={match.elapsed} />
        ) : finished ? (
          <span className="font-medium">FT</span>
        ) : (
          <span>{formatKickoffTime(match.kickoff_utc)}</span>
        )}
      </div>

      <div className="space-y-1.5">
        <TeamRow
          team={match.home_team}
          fallback="Home TBD"
          goals={hasScore ? match.home_score : null}
        />
        <TeamRow
          team={match.away_team}
          fallback="Away TBD"
          goals={hasScore ? match.away_score : null}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{match.venue ?? "Venue TBD"}</span>
        {!live && !finished ? <span>{formatKickoff(match.kickoff_utc)}</span> : null}
      </div>
    </Link>
  );
}
