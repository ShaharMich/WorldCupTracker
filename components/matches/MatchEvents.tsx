import type { MatchEvent } from "@/types/match";

function icon(type: string, detail: string): string {
  const t = type.toLowerCase();
  if (t === "goal") return detail.toLowerCase().includes("penalty") ? "⚽ (P)" : "⚽";
  if (t === "card") return detail.toLowerCase().includes("red") ? "🟥" : "🟨";
  if (t === "subst") return "🔄";
  if (t === "var") return "📺";
  return "•";
}

export function MatchEvents({ events }: { events: MatchEvent[] | null }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events recorded.</p>;
  }
  return (
    <ol className="space-y-2">
      {events.map((e, i) => (
        <li key={i} className="flex items-baseline gap-3 text-sm">
          <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
            {e.minute != null ? `${e.minute}'` : "—"}
          </span>
          <span className="w-8 shrink-0 text-center">{icon(e.type, e.detail ?? "")}</span>
          <span className="min-w-0">
            <span className="font-medium">{e.player ?? "—"}</span>
            {e.assist ? (
              <span className="text-muted-foreground"> (assist {e.assist})</span>
            ) : null}
            {e.detail && e.type.toLowerCase() !== "goal" ? (
              <span className="text-muted-foreground"> · {e.detail}</span>
            ) : null}
            {e.team ? <span className="text-muted-foreground"> · {e.team}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
