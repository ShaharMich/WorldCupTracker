import type { ClubSeasonStats } from "@/types/player";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function PlayerStats({
  stats,
  title,
}: {
  stats: ClubSeasonStats | null;
  title: string;
}) {
  if (!stats) {
    return (
      <div>
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">No stats available.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Appearances" value={stats.appearances ?? 0} />
        <StatCard label="Goals" value={stats.goals ?? 0} />
        <StatCard label="Assists" value={stats.assists ?? 0} />
        <StatCard label="Rating" value={stats.rating ? Number(stats.rating).toFixed(2) : "—"} />
      </div>
    </div>
  );
}
