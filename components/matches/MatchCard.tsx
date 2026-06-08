import Link from "next/link";
import Image from "next/image";
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
        <TeamBadge team={team} size={24} fallbackName={fallback} />
        <span className="truncate text-sm font-semibold">
          {team?.name ?? fallback}
        </span>
      </div>
      {goals != null ? (
        <span className="tabular-nums text-base font-bold">{goals}</span>
      ) : null}
    </div>
  );
}

export function MatchCard({ match }: { match: MatchWithTeams }) {
  const live = isLiveStatus(match.status);
  const finished = isFinishedStatus(match.status);
  const hasScore = score(match) != null;
  const homeCrest = match.home_team?.logo_url || match.home_team?.flag_url;
  const awayCrest = match.away_team?.logo_url || match.away_team?.flag_url;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10"
    >
      {/* Faint crest backdrop — home on the left, away on the right. */}
      {homeCrest ? (
        <Image
          src={homeCrest}
          alt=""
          aria-hidden
          width={120}
          height={120}
          unoptimized
          className="pointer-events-none absolute -left-5 top-1/2 size-24 -translate-y-1/2 object-contain opacity-[0.06] transition-opacity group-hover:opacity-[0.1]"
        />
      ) : null}
      {awayCrest ? (
        <Image
          src={awayCrest}
          alt=""
          aria-hidden
          width={120}
          height={120}
          unoptimized
          className="pointer-events-none absolute -right-5 top-1/2 size-24 -translate-y-1/2 object-contain opacity-[0.06] transition-opacity group-hover:opacity-[0.1]"
        />
      ) : null}

      <div className="relative">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate font-medium">
            {match.stage}
            {match.group_code ? ` · Group ${match.group_code}` : ""}
          </span>
          {live ? (
            <LiveBadge elapsed={match.elapsed} />
          ) : finished ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 font-bold text-foreground">FT</span>
          ) : (
            <span className="font-semibold text-primary">{formatKickoffTime(match.kickoff_utc)}</span>
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

        <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span className="truncate">
            {match.venue ?? "Stadium TBD"}
            {match.city ? ` · ${match.city}` : ""}
          </span>
          {!live && !finished ? <span className="shrink-0">{formatKickoff(match.kickoff_utc)}</span> : null}
        </div>
      </div>
    </Link>
  );
}
