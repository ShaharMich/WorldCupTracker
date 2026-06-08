import type { Metadata } from "next";
import { BracketMatch } from "@/components/bracket/BracketMatch";
import { SetupNotice } from "@/components/EmptyState";
import { getKnockoutMatches } from "@/lib/queries";
import { KNOCKOUT_STAGES } from "@/lib/constants";
import type { MatchWithTeams } from "@/types/match";

export const metadata: Metadata = { title: "Bracket" };
export const revalidate = 60;

const STAGE_LABELS: Record<string, string> = {
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  "Quarter-final": "Quarter-finals",
  "Semi-final": "Semi-finals",
  "Final": "Final",
};

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

  const thirdPlace = byStage.get("Third-place Play-off") ?? [];

  return (
    <div className="mx-auto max-w-[100rem] px-4 py-8">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Knockout <span className="text-gradient-gold">Bracket</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          32 teams · Round of 32 → Final. Slots fill in as the group stage concludes.
        </p>
      </div>

      <div className="wc-pitch -mx-4 overflow-x-auto px-4 py-4">
        <div className="flex min-w-max gap-6">
          {KNOCKOUT_STAGES.map((stage) => {
            const stageMatches = byStage.get(stage) ?? [];
            if (stageMatches.length === 0) return null;
            return (
              <section key={stage} className="flex flex-col">
                <h2 className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-primary">
                  {STAGE_LABELS[stage] ?? stage}
                </h2>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {stageMatches.map((m) =>
                    stage === "Final" ? (
                      <div key={m.id} className="flex flex-col items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        <BracketMatch match={m} />
                      </div>
                    ) : (
                      <BracketMatch key={m.id} match={m} />
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {thirdPlace.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Third-place Play-off
          </h2>
          <div className="flex flex-wrap gap-3">
            {thirdPlace.map((m) => (
              <BracketMatch key={m.id} match={m} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
