import type { CareerClub } from "@/types/player";

export function PlayerCareer({
  career,
  currentClub,
}: {
  career: CareerClub[] | null;
  currentClub?: string | null;
}) {
  // Fall back to the current club when no transfer history exists — many players
  // who came through one club's academy (e.g. Lamine Yamal at Barcelona) have no
  // transfer records, so show at least the club they play for rather than nothing.
  const rows: CareerClub[] =
    career && career.length > 0
      ? career
      : currentClub
        ? [{ club: currentClub, season: "", appearances: null, goals: null }]
        : [];

  if (rows.length === 0) {
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
        {rows.map((c, i) => (
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
