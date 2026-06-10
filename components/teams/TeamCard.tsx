import Link from "next/link";
import Image from "next/image";
import { TeamBadge } from "@/components/TeamBadge";
import { FifaRankBadge } from "@/components/teams/FifaRankBadge";
import { HeartButton } from "@/components/favorites/HeartButton";
import type { Team } from "@/types/team";

export function TeamCard({ team }: { team: Team }) {
  const crest = team.logo_url || team.flag_url;
  return (
    <div className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10">
      {/* The whole card is a link; the heart sits on top with its own z-index. */}
      <Link href={`/teams/${team.id}`} className="absolute inset-0 z-0" aria-label={team.name} />

      {team.fifa_rank != null ? (
        <FifaRankBadge rank={team.fifa_rank} className="pointer-events-none absolute left-1.5 top-1.5 z-10" />
      ) : null}

      <HeartButton
        type="team"
        itemId={team.id}
        name={team.name}
        className="absolute right-1.5 top-1.5 z-10"
      />

      {/* Faint crest watermark for depth + energy. */}
      {crest ? (
        <Image
          src={crest}
          alt=""
          aria-hidden
          width={160}
          height={160}
          unoptimized
          className="pointer-events-none absolute -right-6 -top-6 size-32 rotate-12 object-contain opacity-[0.06] transition-opacity duration-200 group-hover:opacity-[0.12]"
        />
      ) : null}

      <div className="pointer-events-none relative grid size-16 place-items-center rounded-full bg-secondary/50 ring-1 ring-border transition-transform duration-200 group-hover:scale-110">
        <TeamBadge team={team} size={44} />
      </div>

      <div className="pointer-events-none relative min-w-0">
        <p className="truncate font-bold leading-tight group-hover:text-primary">{team.name}</p>
        {team.confederation ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{team.confederation}</p>
        ) : null}
      </div>
    </div>
  );
}
