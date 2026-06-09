import Link from "next/link";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { TeamBadge } from "@/components/TeamBadge";
import { HeartButton } from "@/components/favorites/HeartButton";
import { POSITION_ORDER, positionGroup } from "@/lib/utils";
import type { Player } from "@/types/player";

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="relative flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
      <Link
        href={`/players/${player.id}`}
        className="absolute inset-0 z-0"
        aria-label={player.name}
      />
      <span className="pointer-events-none w-6 shrink-0 text-center text-sm tabular-nums text-muted-foreground">
        {player.jersey_number ?? "—"}
      </span>
      <span className="pointer-events-none">
        <PlayerPhoto src={player.photo_url} name={player.name} size={36} />
      </span>
      <span className="pointer-events-none min-w-0 flex-1">
        <span className="block truncate font-medium">{player.name}</span>
        {player.club_name ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <TeamBadge
              team={{ name: player.club_name, logo_url: player.club_logo_url, flag_url: null }}
              size={14}
            />
            <span className="truncate">{player.club_name}</span>
          </span>
        ) : null}
      </span>
      {player.age != null ? (
        <span className="pointer-events-none shrink-0 text-sm text-muted-foreground">
          {player.age}y
        </span>
      ) : null}
      <HeartButton type="player" itemId={player.id} name={player.name} className="relative z-10" />
    </div>
  );
}

export function SquadTable({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return <p className="text-sm text-muted-foreground">Squad not available yet.</p>;
  }

  const byPosition = new Map<string, Player[]>();
  for (const p of players) {
    const key = p.position ?? "Other";
    if (!byPosition.has(key)) byPosition.set(key, []);
    byPosition.get(key)!.push(p);
  }

  const ordered = [
    ...POSITION_ORDER.filter((p) => byPosition.has(p)),
    ...[...byPosition.keys()].filter((p) => !POSITION_ORDER.includes(p)),
  ];

  return (
    <div className="space-y-6">
      {ordered.map((pos) => (
        <div key={pos}>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {positionGroup(pos)}
          </h3>
          <div className="divide-y divide-border">
            {byPosition.get(pos)!.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
