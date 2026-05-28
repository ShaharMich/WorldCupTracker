import { NextResponse } from "next/server";
import { runSeed, type SeedOptions } from "@/lib/seed";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false; // must set a secret to enable this route
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const steps = url.searchParams.getAll("step");
  const opts: SeedOptions =
    steps.length === 0
      ? { teams: true, players: true, fixtures: true, standings: true }
      : {
          teams: steps.includes("teams"),
          players: steps.includes("players"),
          fixtures: steps.includes("fixtures"),
          standings: steps.includes("standings"),
        };

  const logs: string[] = [];
  try {
    await runSeed(opts, (m) => logs.push(m));
    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, logs },
      { status: 500 },
    );
  }
}
