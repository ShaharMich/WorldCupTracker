import { BracketMatch } from "@/components/bracket/BracketMatch";
import { SetupNotice } from "@/components/EmptyState";
import { getKnockoutMatches } from "@/lib/queries";
import type { MatchWithTeams } from "@/types/match";
import { BRACKET_LAYOUT } from "@/lib/knockout-bracket";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Bracket",
  description: "The full FIFA World Cup 2026 knockout bracket, from the Round of 32 to the Final.",
  path: "/bracket",
});
export const revalidate = 60;

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

  // Order each column by the actual bracket topology (lib/knockout-bracket.ts),
  // not by kickoff — kickoff order interleaves the two halves and would put a
  // group's winner and runner-up on the same visual side.
  const byId = new Map(matches.map((m) => [m.id, m]));
  const pick = (ids: readonly number[]): MatchWithTeams[] =>
    ids.map((id) => byId.get(id)).filter((m): m is MatchWithTeams => m != null);

  const r32L = pick(BRACKET_LAYOUT.left.r32);
  const r32R = pick(BRACKET_LAYOUT.right.r32);
  const r16L = pick(BRACKET_LAYOUT.left.r16);
  const r16R = pick(BRACKET_LAYOUT.right.r16);
  const qfL = pick(BRACKET_LAYOUT.left.qf);
  const qfR = pick(BRACKET_LAYOUT.right.qf);
  const sfL = pick(BRACKET_LAYOUT.left.sf);
  const sfR = pick(BRACKET_LAYOUT.right.sf);
  const final = matches.filter((m) => m.stage === "Final");
  const third = matches.filter((m) => m.stage === "Third-place Play-off");

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
