"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/components/providers/FavoritesProvider";
import type { FavoriteType } from "@/lib/favorites";
import { cn } from "@/lib/utils";

interface Props {
  type: FavoriteType;
  itemId: number;
  /** Accessible label noun, e.g. the team or player name. */
  name?: string;
  size?: number;
  className?: string;
}

// Toggle a team/player favorite. Designed to sit on top of (or inside) a card
// link, so it stops click propagation and prevents default navigation.
export function HeartButton({ type, itemId, name, size = 18, className }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(type, itemId);
  const label = `${active ? "Remove" : "Add"} ${name ?? type} ${active ? "from" : "to"} favorites`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(type, itemId);
      }}
      className={cn(
        "inline-grid place-items-center rounded-full p-1.5 transition-colors",
        "text-muted-foreground hover:bg-secondary hover:text-primary",
        active && "text-primary",
        className,
      )}
    >
      <Heart
        className={cn("transition-transform", active && "scale-110 fill-current")}
        style={{ width: size, height: size }}
      />
    </button>
  );
}
