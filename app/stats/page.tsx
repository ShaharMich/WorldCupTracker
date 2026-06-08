import Link from "next/link";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { TeamBadge } from "@/components/TeamBadge";
import { EmptyState } from "@/components/EmptyState";
import { getStatLeaders, type PlayerWithTeam } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Stats",
  description: "World Cup 2026 top scorers and assist leaders, updated after every match.",
  path: "/stats",
});
export const revalidate = 60;

function LeaderTable({
  title,
  rows,
  stat,
}: {
  title: string;
  rows: PlayerWithTeam[];
  stat: (p: PlayerWithTeam) => number;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <h2 className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-wide">
        <span className="text-gradient-gold">{title}</span>
        <span className="text-xs font-medium text-muted-foreground">
          {title.includes("Scorer") ? "Goals" : "Assists"}
        </span>
      </h2>
      <ol className="divide-y divide-border">
        {rows.map((p, i) => (
          <li key={p.id}>
            <Link
              href={`/players/${p.id}`}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary/50"
            >
              <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <PlayerPhoto src={p.photo_url} name={p.name} size={36} className="size-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {p.team ? <TeamBadge team={p.team} size={14} /> : null}
                  <span className="truncate">{p.team?.name ?? p.nationality ?? ""}</span>
                </div>
              </div>
              {p.club_name ? (
                <TeamBadge
                  team={{ name: p.club_name, logo_url: p.club_logo_url, flag_url: null }}
                  size={20}
                  className="shrink-0"
                />
              ) : null}
              <span className="w-7 shrink-0 text-right text-lg font-bold tabular-nums text-primary">
                {stat(p)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function StatsPage() {
  const { scorers, assisters } = await getStatLeaders();
  const empty = scorers.length === 0 && assisters.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">
        Top <span className="text-gradient-gold">Scorers &amp; Assisters</span>
      </h1>

      {empty ? (
        <EmptyState
          title="No stats yet"
          message="Stats will appear after matches kick off on June 11"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <LeaderTable title="Top Scorers" rows={scorers} stat={(p) => p.stats_wc?.goals ?? 0} />
          <LeaderTable title="Top Assisters" rows={assisters} stat={(p) => p.stats_wc?.assists ?? 0} />
        </div>
      )}
    </div>
  );
}
