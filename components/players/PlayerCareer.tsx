import type { CareerClub } from "@/types/player";

export function PlayerCareer({ career }: { career: CareerClub[] | null }) {
  if (!career || career.length === 0) {
    return (
      <div>
        <h2 className="mb-2 text-lg font-semibold">Career</h2>
        <p className="text-sm text-muted-foreground">Career history not available.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">Career</h2>
      <div className="divide-y divide-border rounded-lg border border-border">
        {career.map((c, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-medium">{c.club}</span>
            <span className="text-muted-foreground">{c.season}</span>
            {c.appearances != null || c.goals != null ? (
              <span className="tabular-nums text-muted-foreground">
                {c.appearances ?? 0} apps · {c.goals ?? 0} g
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
