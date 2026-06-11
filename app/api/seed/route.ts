import { NextResponse } from "next/server";
import { runSeed, type SeedOptions } from "@/lib/seed";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STEP_NAMES = [
  "teams",
  "players",
  "fixtures",
  "fixturemap",
  "coaches",
  "rankings",
  "standings",
  "wcstats",
  "live",
] as const;

function authorized(req: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false; // must set a secret to enable this route
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

// Collect step names from any of: a string ("live"), a comma-separated string
// ("live,wcstats"), or an array. Unknown tokens are ignored.
function collectSteps(value: unknown, into: Set<string>): void {
  const push = (s: string) =>
    s
      .split(",")
      .map((t) => t.trim())
      .filter((t) => (STEP_NAMES as readonly string[]).includes(t))
      .forEach((t) => into.add(t));
  if (typeof value === "string") push(value);
  else if (Array.isArray(value)) value.forEach((v) => typeof v === "string" && push(v));
}

// Read requested steps from BOTH the query string (?step=live, used by the
// GitHub Actions workflows) and the POST body (JSON {"step":"live"} or
// form-encoded step=live, used by cron-job.org). Without the body parse, a
// body-only request looked like "no steps" and silently ran the FULL seed.
async function readSteps(req: Request, url: URL): Promise<string[]> {
  const steps = new Set<string>();
  url.searchParams.getAll("step").forEach((s) => collectSteps(s, steps));

  const contentType = req.headers.get("content-type") ?? "";
  try {
    const raw = await req.text();
    if (raw) {
      if (contentType.includes("application/json")) {
        const body = JSON.parse(raw) as Record<string, unknown>;
        collectSteps(body.step ?? body.steps, steps);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        new URLSearchParams(raw).getAll("step").forEach((s) => collectSteps(s, steps));
      } else {
        // Unknown/empty content-type: try JSON, then form-encoded.
        try {
          const body = JSON.parse(raw) as Record<string, unknown>;
          collectSteps(body.step ?? body.steps, steps);
        } catch {
          new URLSearchParams(raw).getAll("step").forEach((s) => collectSteps(s, steps));
        }
      }
    }
  } catch {
    // Unreadable/malformed body — fall back to whatever the query string gave us.
  }

  return [...steps];
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const steps = await readSteps(req, url);
  const opts: SeedOptions =
    steps.length === 0
      ? { teams: true, players: true, fixtures: true, fixturemap: true, coaches: true, rankings: true, standings: true, wcstats: true, live: true }
      : {
          teams: steps.includes("teams"),
          players: steps.includes("players"),
          fixtures: steps.includes("fixtures"),
          fixturemap: steps.includes("fixturemap"),
          coaches: steps.includes("coaches"),
          rankings: steps.includes("rankings"),
          standings: steps.includes("standings"),
          wcstats: steps.includes("wcstats"),
          live: steps.includes("live"),
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
