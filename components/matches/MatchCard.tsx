import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { LiveBadge } from "@/components/matches/LiveBadge";
import { formatKickoff, formatKickoffTime } from "@/lib/utils";
import { isLiveStatus, isFinishedStatus, type MatchWithTeams } from "@/types/match";

export function MatchCard({ match }: { match: MatchWithTeams }) {
  const live = isLiveStatus(match.status);
  const finished = isFinishedStatus(match.status);
  const hasScore = match.home_score != null && match.away_score != null;

  // Centre value: score when we have one, otherwise the kickoff time.
  const center = hasScore
    ? `${match.home_score} - ${match.away_score}`
    : formatKickoffTime(match.kickoff_utc);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate font-medium">
          {match.stage}
          {match.group_code ? ` · Group ${match.group_code}` : ""}
        </span>
        {live ? (
          <LiveBadge elapsed={match.elapsed} />
        ) : finished ? (
          <span className="rounded bg-secondary px-1.5 py-0.5 font-bold text-foreground">FT</span>
        ) : null}
      </div>

      {/* Clear 32px flags on each side; names centred and always shown in full
          (wrapping to a second line rather than truncating). */}
      <div className="flex items-center gap-2">
        <TeamBadge
          team={match.home_team}
          size={32}
          fallbackName="Home TBD"
          className="size-8 shrink-0"
        />
        <span className="flex-1 text-balance break-words text-right text-sm font-semibold leading-tight">
          {match.home_team?.name ?? "TBD"}
        </span>

        <span className="shrink-0 px-1 text-center text-base font-bold tabular-nums leading-tight">
          {center}
        </span>

        <span className="flex-1 text-balance break-words text-left text-sm font-semibold leading-tight">
          {match.away_team?.name ?? "TBD"}
        </span>
        <TeamBadge
          team={match.away_team}
          size={32}
          fallbackName="Away TBD"
          className="size-8 shrink-0"
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
        <span className="truncate">
          {match.venue ?? "Stadium TBD"}
          {match.city ? ` · ${match.city}` : ""}
        </span>
        {!live ? <span className="shrink-0">{formatKickoff(match.kickoff_utc)}</span> : null}
      </div>
    </Link>
  );
}
