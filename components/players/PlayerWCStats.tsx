import type { ClubSeasonStats } from "@/types/player";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3 text-center shadow-sm">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// World Cup 2026 tournament stats — appearances, goals, assists, cards, minutes.
// Only rendered once the player has WC stats (populated after their matches).
export function PlayerWCStats({ stats }: { stats: ClubSeasonStats | null }) {
  if (!stats) return null;
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
    </div>
  );
}
