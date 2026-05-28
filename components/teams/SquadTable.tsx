import Link from "next/link";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { TeamBadge } from "@/components/TeamBadge";
import { POSITION_ORDER, positionGroup } from "@/lib/utils";
import type { Player } from "@/types/player";

function PlayerRow({ player }: { player: Player }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
    >
      <span className="w-6 shrink-0 text-center text-sm tabular-nums text-muted-foreground">
        {player.jersey_number ?? "—"}
      </span>
      <PlayerPhoto src={player.photo_url} name={player.name} size={36} />
      <span className="min-w-0 flex-1">
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
        <span className="shrink-0 text-sm text-muted-foreground">{player.age}y</span>
      ) : null}
    </Link>
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
