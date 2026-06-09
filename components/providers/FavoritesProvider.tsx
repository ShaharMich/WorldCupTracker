"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  favKey,
  parseFavKey,
  readLocalFavorites,
  writeLocalFavorites,
  clearLocalFavorites,
  type FavoriteType,
} from "@/lib/favorites";

interface FavoritesContextValue {
  // Set of `${type}:${itemId}` keys.
  favorites: Set<string>;
  ready: boolean;
  isFavorite: (type: FavoriteType, itemId: number) => boolean;
  toggle: (type: FavoriteType, itemId: number) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  // Track the previous user id so we only migrate on a guest→user transition.
  const prevUserId = useRef<string | null | undefined>(undefined);

  // Load favorites whenever auth settles or the user changes.
  useEffect(() => {
    if (authLoading) return;
    let active = true;

    async function load() {
      if (user) {
        // On guest→login transition, migrate any localStorage favorites first.
        const wasGuest = prevUserId.current === null;
        if (wasGuest) {
          await migrateLocalToSupabase(user.id);
        }
        const { data } = await supabase
          .from("favorites")
          .select("type, item_id")
          .eq("user_id", user.id);
        if (!active) return;
        const next = new Set<string>();
        for (const row of data ?? []) {
          next.add(favKey(row.type as FavoriteType, row.item_id as number));
        }
        setFavorites(next);
      } else {
        if (!active) return;
        setFavorites(readLocalFavorites());
      }
      prevUserId.current = user?.id ?? null;
      setReady(true);
    }

    load();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const isFavorite = useCallback(
    (type: FavoriteType, itemId: number) => favorites.has(favKey(type, itemId)),
    [favorites],
  );

  const toggle = useCallback(
    (type: FavoriteType, itemId: number) => {
      const key = favKey(type, itemId);
      const has = favorites.has(key);
      // Optimistic local update.
      const next = new Set(favorites);
      if (has) next.delete(key);
      else next.add(key);
      setFavorites(next);

      if (user) {
        // Persist to Supabase; revert on failure.
        const op = has
          ? supabase
              .from("favorites")
              .delete()
              .eq("user_id", user.id)
              .eq("type", type)
              .eq("item_id", itemId)
          : supabase
              .from("favorites")
              .insert({ user_id: user.id, type, item_id: itemId });
        Promise.resolve(op).then(({ error }) => {
          if (error) setFavorites(favorites); // revert to pre-toggle set
        });
      } else {
        writeLocalFavorites(next);
      }
    },
    [favorites, user],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, ready, isFavorite, toggle }),
    [favorites, ready, isFavorite, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

// Upsert all localStorage favorites into Supabase, then clear localStorage.
// Conflicts (already-saved rows) are ignored so re-migration is harmless.
async function migrateLocalToSupabase(userId: string): Promise<void> {
  const local = readLocalFavorites();
  if (local.size === 0) return;
  const rows = [...local]
    .map(parseFavKey)
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({ user_id: userId, type: r.type, item_id: r.itemId }));
  if (rows.length > 0) {
    await supabase
      .from("favorites")
      .upsert(rows, { onConflict: "user_id,type,item_id", ignoreDuplicates: true });
  }
  clearLocalFavorites();
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within <FavoritesProvider>");
  return ctx;
}
