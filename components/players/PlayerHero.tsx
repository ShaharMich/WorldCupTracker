import Link from "next/link";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { TeamBadge } from "@/components/TeamBadge";
import { HeartButton } from "@/components/favorites/HeartButton";
import type { Player } from "@/types/player";
import type { Team } from "@/types/team";

export function PlayerHero({ player, team }: { player: Player; team: Team | null }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-start">
      <PlayerPhoto src={player.photo_url} name={player.name} size={120} />
      <div className="flex-1 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-2xl font-bold">{player.name}</h1>
          {player.jersey_number != null ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold">
              #{player.jersey_number}
            </span>
          ) : null}
          <HeartButton
            type="player"
            itemId={player.id}
            name={player.name}
            size={22}
            className="border border-border"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
          {player.position ? <span>{player.position}</span> : null}
          {player.nationality ? <span>{player.nationality}</span> : null}
          {player.age != null ? <span>{player.age} years</span> : null}
          {player.height ? <span>{player.height}</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm sm:justify-start">
          {team ? (
            <Link href={`/teams/${team.id}`} className="flex items-center gap-1.5 hover:underline">
              <TeamBadge team={team} size={20} />
              {team.name}
            </Link>
          ) : null}
          {player.club_name ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TeamBadge
                team={{ name: player.club_name, logo_url: player.club_logo_url, flag_url: null }}
                size={20}
              />
              {player.club_name}
              {player.club_country ? ` · ${player.club_country}` : ""}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
