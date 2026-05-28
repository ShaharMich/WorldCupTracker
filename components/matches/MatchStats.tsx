import type { MatchStatItem } from "@/types/match";

function toNumber(v: number | string | null): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return parseFloat(v.replace("%", "")) || 0;
}

function StatRow({ item }: { item: MatchStatItem }) {
  const home = toNumber(item.home);
  const away = toNumber(item.away);
  const total = home + away || 1;
  const homePct = (home / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium tabular-nums">{item.home ?? 0}</span>
        <span className="text-muted-foreground">{item.type}</span>
        <span className="font-medium tabular-nums">{item.away ?? 0}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${homePct}%` }} />
        <div className="bg-primary/30" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

export function MatchStats({ stats }: { stats: MatchStatItem[] | null }) {
  if (!stats || stats.length === 0) {
    return <p className="text-sm text-muted-foreground">No statistics available.</p>;
  }
  return (
    <div className="space-y-3">
      {stats.map((s) => (
        <StatRow key={s.type} item={s} />
      ))}
    </div>
  );
}
