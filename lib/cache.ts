import { getServerSupabase } from "@/lib/supabase/server";

// Reads from the api_cache table first; on miss (or expiry) runs fetchFn,
// stores the result, and returns it. ttlMinutes <= 0 means "cache forever".
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMinutes: number,
): Promise<T> {
  const db = getServerSupabase();
  const now = Date.now();

  const { data: row } = await db
    .from("api_cache")
    .select("data, expires_at")
    .eq("key", key)
    .maybeSingle();

  if (row && new Date(row.expires_at).getTime() > now) {
    return row.data as T;
  }

  const fresh = await fetchFn();

  // ttl <= 0 → far-future expiry (effectively forever).
  const expiresAt =
    ttlMinutes > 0
      ? new Date(now + ttlMinutes * 60_000)
      : new Date("2999-12-31T00:00:00Z");

  await db.from("api_cache").upsert({
    key,
    data: fresh as unknown as Record<string, unknown>,
    fetched_at: new Date(now).toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  return fresh;
}

export async function invalidateCache(keyPrefix: string): Promise<void> {
  const db = getServerSupabase();
  await db.from("api_cache").delete().like("key", `${keyPrefix}%`);
}
