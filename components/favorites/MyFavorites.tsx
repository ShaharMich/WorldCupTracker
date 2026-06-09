"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useFavorites } from "@/components/providers/FavoritesProvider";
import { TeamCard } from "@/components/teams/TeamCard";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { TeamBadge } from "@/components/TeamBadge";
import { HeartButton } from "@/components/favorites/HeartButton";
import { parseFavKey } from "@/lib/favorites";
import type { Team } from "@/types/team";
import type { Player } from "@/types/player";

// Home-page section listing the visitor's favorited teams + players. Guests read
// favorites from localStorage; logged-in users from Supabase — both flow through
// the favorites context, so this component only needs the resolved ids.
export function MyFavorites() {
  const { user } = useAuth();
  const { favorites, ready } = useFavorites();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  // Derive the favorited ids, with a stable string key so the fetch effect only
  // re-runs when the actual set of items changes.
  const { teamIds, playerIds, signature } = useMemo(() => {
    const tIds: number[] = [];
    const pIds: number[] = [];
    for (const key of favorites) {
      const ref = parseFavKey(key);
      if (!ref) continue;
      if (ref.type === "team") tIds.push(ref.itemId);
      else pIds.push(ref.itemId);
    }
    return {
      teamIds: tIds,
      playerIds: pIds,
      signature: [...favorites].sort().join(","),
    };
  }, [favorites]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [teamRes, playerRes] = await Promise.all([
        teamIds.length
          ? supabase.from("teams").select("*").in("id", teamIds)
          : Promise.resolve({ data: [] as Team[] }),
        playerIds.length
          ? supabase.from("players").select("*").in("id", playerIds)
          : Promise.resolve({ data: [] as Player[] }),
      ]);
      if (!active) return;
      setTeams((teamRes.data as Team[]) ?? []);
      setPlayers((playerRes.data as Player[]) ?? []);
    }

    load();
    return () => {
      active = false;
    };
    // signature captures the full set of favorited ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Don't render until favorites have loaded, to avoid an empty-state flash.
  if (!ready) return null;

  const hasFavorites = teams.length > 0 || players.length > 0;

  return (
    <section id="favorites" className="mt-10 scroll-mt-20">
      <div className="mb-3 flex items-center gap-2">
        <Heart className="size-5 text-primary" />
        <h2 className="text-xl font-semibold">My Favorites</h2>
      </div>

      {!hasFavorites ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p className="font-medium">No favorites yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Tap the{" "}
            <Heart className="inline size-4 align-text-bottom" /> on any team or player to
            save it here.
            {!user ? (
              <>
                {" "}
                <Link href="/login" className="text-primary hover:underline">
                  Log in
                </Link>{" "}
                to sync favorites across your devices.
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Teams
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {teams.map((t) => (
                  <TeamCard key={t.id} team={t} />
                ))}
              </div>
            </div>
          ) : null}

          {players.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Players
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {players.map((p) => (
                  <FavoritePlayerCard key={p.id} player={p} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function FavoritePlayerCard({ player }: { player: Player }) {
  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/60">
      <Link href={`/players/${player.id}`} className="absolute inset-0" aria-label={player.name} />
      <PlayerPhoto src={player.photo_url} name={player.name} size={44} />
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="truncate font-medium group-hover:text-primary">{player.name}</p>
        {player.club_name ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <TeamBadge
              team={{ name: player.club_name, logo_url: player.club_logo_url, flag_url: null }}
              size={14}
            />
            <span className="truncate">{player.club_name}</span>
          </span>
        ) : null}
      </div>
      <HeartButton type="player" itemId={player.id} name={player.name} className="relative z-10" />
    </div>
  );
}
