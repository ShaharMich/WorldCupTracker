import type { Metadata } from "next";
import { BracketMatch } from "@/components/bracket/BracketMatch";
import { SetupNotice } from "@/components/EmptyState";
import { getKnockoutMatches } from "@/lib/queries";
import type { MatchWithTeams } from "@/types/match";

export const metadata: Metadata = { title: "Bracket" };
export const revalidate = 60;

// Splits a round's matches into [leftHalf, rightHalf] for the two-sided bracket.
function half<T>(arr: T[]): [T[], T[]] {
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
}

function Column({ label, matches }: { label: string; matches: MatchWithTeams[] }) {
  if (matches.length === 0) return null;
  return (
    <div className="flex flex-col">
      <h2 className="mb-3 text-center text-[11px] font-bold uppercase tracking-widest text-primary">
        {label}
      </h2>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {matches.map((m) => (
          <BracketMatch key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

export default async function BracketPage() {
  const matches = await getKnockoutMatches();

  if (matches.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Knockout Bracket</h1>
        <SetupNotice />
      </div>
    );
  }

  const byStage = new Map<string, MatchWithTeams[]>();
  for (const m of matches) {
    const key = m.stage ?? "?";
    if (!byStage.has(key)) byStage.set(key, []);
    byStage.get(key)!.push(m);
  }

  const [r32L, r32R] = half(byStage.get("Round of 32") ?? []);
  const [r16L, r16R] = half(byStage.get("Round of 16") ?? []);
  const [qfL, qfR] = half(byStage.get("Quarter-final") ?? []);
  const [sfL, sfR] = half(byStage.get("Semi-final") ?? []);
  const final = byStage.get("Final") ?? [];
  const third = byStage.get("Third-place Play-off") ?? [];

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-8">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Knockout <span className="text-gradient-gold">Bracket</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          32 teams converging on the Final. Slots fill in as the group stage concludes.
        </p>
      </div>

      <div className="wc-pitch -mx-4 overflow-x-auto px-4 py-6">
        <div className="flex min-w-max items-stretch justify-center gap-3 md:gap-4">
          {/* Left side: outer rounds → centre */}
          <Column label="Round of 32" matches={r32L} />
          <Column label="Round of 16" matches={r16L} />
          <Column label="Quarter-finals" matches={qfL} />
          <Column label="Semi-finals" matches={sfL} />

          {/* Centre: Final, with the Third-place Play-off directly below it */}
          <div className="flex flex-col items-center justify-center gap-8 px-1">
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">🏆</span>
              <h2 className="text-center text-[11px] font-bold uppercase tracking-widest text-primary">
                Final
              </h2>
              {final.map((m) => (
                <BracketMatch key={m.id} match={m} />
              ))}
            </div>
            {third.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Third Place
                </h2>
                {third.map((m) => (
                  <BracketMatch key={m.id} match={m} />
                ))}
              </div>
            ) : null}
          </div>

          {/* Right side: centre → outer rounds */}
          <Column label="Semi-finals" matches={sfR} />
          <Column label="Quarter-finals" matches={qfR} />
          <Column label="Round of 16" matches={r16R} />
          <Column label="Round of 32" matches={r32R} />
        </div>
      </div>
    </div>
  );
}
