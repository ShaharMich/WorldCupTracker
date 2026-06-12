import type { WCStats, WCMatchStat } from "@/types/player";
import { LocalTime } from "@/components/LocalTime";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3 text-center shadow-sm">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// A compact stat chip (e.g. "1 G", "7.4") shown on a per-match line. Hidden when
// the value is zero so a quiet game stays uncluttered.
function Chip({ value, label, tone }: { value: number; label: string; tone: string }) {
  if (!value) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {value} {label}
    </span>
  );
}

function MatchRow({ m }: { m: WCMatchStat }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        {m.home ? "vs" : "at"}
      </span>
      <span className="flex-1 truncate text-sm font-semibold">{m.opponent}</span>
      <span className="text-xs text-muted-foreground">
        <LocalTime utc={m.date} mode="date" />
      </span>
      <div className="flex w-full items-center gap-1.5 sm:w-auto">
        <Chip value={m.goals} label="G" tone="bg-emerald-500/15 text-emerald-400" />
        <Chip value={m.assists} label="A" tone="bg-sky-500/15 text-sky-400" />
        <Chip value={m.yellow_cards} label="🟨" tone="bg-yellow-500/15 text-yellow-400" />
        <Chip value={m.red_cards} label="🟥" tone="bg-red-500/15 text-red-400" />
        <span className="text-xs text-muted-foreground tabular-nums">{m.minutes}&apos;</span>
        {m.rating ? (
          <span className="ml-auto rounded bg-primary/15 px-1.5 py-0.5 text-xs font-bold tabular-nums text-primary sm:ml-0">
            {m.rating}
          </span>
        ) : null}
      </div>
    </li>
  );
}

// World Cup 2026 tournament stats — aggregated totals plus a per-match breakdown.
// Only rendered once the player has WC stats (populated after their matches).
export function PlayerWCStats({ stats }: { stats: WCStats | null }) {
  if (!stats) return null;
  const matches = stats.matches ?? [];
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <span>🏆</span>
        <span className="text-gradient-gold">World Cup 2026</span>
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <StatCard label="Apps" value={stats.appearances ?? 0} />
        <StatCard label="Goals" value={stats.goals ?? 0} />
        <StatCard label="Assists" value={stats.assists ?? 0} />
        <StatCard label="Yellow" value={stats.yellow_cards ?? 0} />
        <StatCard label="Red" value={stats.red_cards ?? 0} />
        <StatCard label="Minutes" value={stats.minutes ?? 0} />
      </div>

      {matches.length > 0 ? (
        <div className="mt-4 rounded-lg border border-border bg-card">
          <h3 className="border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Matches
          </h3>
          <ul className="divide-y divide-border">
            {matches.map((m) => (
              <MatchRow key={m.fixture_id} m={m} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
