import { NextResponse } from "next/server";
import { getMatch } from "@/lib/queries";
import { refreshMatch } from "@/lib/live";
import { isLiveStatus } from "@/types/match";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  const match = await getMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only hit the upstream API for matches that are actually in progress.
  if (isLiveStatus(match.status)) {
    try {
      const fresh = await refreshMatch(matchId);
      if (fresh) return NextResponse.json(fresh);
    } catch (e) {
      // Fall back to cached DB record on upstream failure.
      console.error("refreshMatch failed:", (e as Error).message);
    }
  }

  return NextResponse.json(match);
}
