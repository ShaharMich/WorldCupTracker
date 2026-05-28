"use client";

import { useEffect, useState } from "react";
import { TeamBadge } from "@/components/TeamBadge";
import { LiveBadge } from "@/components/matches/LiveBadge";
import { MatchStats } from "@/components/matches/MatchStats";
import { MatchEvents } from "@/components/matches/MatchEvents";
import { formatKickoff } from "@/lib/utils";
import { isLiveStatus, isFinishedStatus, type MatchWithTeams, type TeamLineup } from "@/types/match";

function Lineups({ lineups }: { lineups: TeamLineup[] | null }) {
  if (!lineups || lineups.length === 0) {
    return <p className="text-sm text-muted-foreground">Lineups not available.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {lineups.map((l, i) => (
        <div key={i}>
          <p className="mb-2 font-medium">
            {l.team_name}
            {l.formation ? <span className="text-muted-foreground"> · {l.formation}</span> : null}
          </p>
          <ol className="space-y-1 text-sm">
            {l.startXI.map((p, j) => (
              <li key={j} className="flex gap-2">
                <span className="w-6 text-right tabular-nums text-muted-foreground">
                  {p.number ?? "—"}
                </span>
                <span>{p.name}</span>
              </li>
            ))}
          </ol>
          {l.substitutes.length > 0 ? (
            <>
              <p className="mb-1 mt-3 text-xs font-semibold uppercase text-muted-foreground">
                Bench
              </p>
              <ol className="space-y-1 text-sm text-muted-foreground">
                {l.substitutes.map((p, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="w-6 text-right tabular-nums">{p.number ?? "—"}</span>
                    <span>{p.name}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MatchDetail({ initial }: { initial: MatchWithTeams }) {
  const [match, setMatch] = useState(initial);
  const live = isLiveStatus(match.status);
  const finished = isFinishedStatus(match.status);
  const hasScore = match.home_score != null && match.away_score != null;

  useEffect(() => {
    if (!isLiveStatus(match.status)) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/matches/${match.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const fresh = (await res.json()) as MatchWithTeams;
        setMatch(fresh);
        if (isFinishedStatus(fresh.status)) clearInterval(id);
      } catch {
        /* keep last good state */
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [match.id, match.status]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>
            {match.stage}
            {match.group_code ? ` · Group ${match.group_code}` : ""}
          </span>
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamBadge team={match.home_team} size={56} fallbackName="Home" />
            <span className="font-medium">{match.home_team?.name ?? "Home TBD"}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {hasScore ? (
              <span className="text-4xl font-bold tabular-nums">
                {match.home_score} - {match.away_score}
              </span>
            ) : (
              <span className="text-lg font-semibold">vs</span>
            )}
            {live ? (
              <LiveBadge elapsed={match.elapsed} />
            ) : finished ? (
              <span className="text-sm font-medium text-muted-foreground">Full Time</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {formatKickoff(match.kickoff_utc)}
              </span>
            )}
            {match.home_score_pen != null && match.away_score_pen != null ? (
              <span className="text-xs text-muted-foreground">
                Pens {match.home_score_pen}-{match.away_score_pen}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamBadge team={match.away_team} size={56} fallbackName="Away" />
            <span className="font-medium">{match.away_team?.name ?? "Away TBD"}</span>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {match.venue ?? "Venue TBD"}
          {match.city ? ` · ${match.city}` : ""}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Events</h2>
        <MatchEvents events={match.events} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Statistics</h2>
        <MatchStats stats={match.stats} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Lineups</h2>
        <Lineups lineups={match.lineups} />
      </section>
    </div>
  );
}
