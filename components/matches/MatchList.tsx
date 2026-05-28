"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/matches/MatchCard";
import { dateKey, formatMatchDay } from "@/lib/utils";
import { isLiveStatus, isFinishedStatus, type MatchWithTeams } from "@/types/match";

type Filter = "All" | "Live" | "Today" | "Group Stage" | "Knockout";
const FILTERS: Filter[] = ["All", "Live", "Today", "Group Stage", "Knockout"];

function matchesFilter(m: MatchWithTeams, filter: Filter, todayKey: string): boolean {
  switch (filter) {
    case "All":
      return true;
    case "Live":
      return isLiveStatus(m.status);
    case "Today":
      return dateKey(m.kickoff_utc) === todayKey;
    case "Group Stage":
      return m.stage === "Group Stage";
    case "Knockout":
      return m.stage !== "Group Stage" && m.stage != null;
  }
}

export function MatchList({ matches }: { matches: MatchWithTeams[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const grouped = useMemo(() => {
    const filtered = matches.filter((m) => matchesFilter(m, filter, todayKey));
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of filtered) {
      const key = dateKey(m.kickoff_utc);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches, filter, todayKey]);

  const liveCount = matches.filter((m) => isLiveStatus(m.status)).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
              (filter === f
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted")
            }
          >
            {f}
            {f === "Live" && liveCount > 0 ? ` (${liveCount})` : ""}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches for this filter.</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, dayMatches]) => (
            <section key={day}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {formatMatchDay(dayMatches[0].kickoff_utc)}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dayMatches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
