import { NextResponse, after } from "next/server";
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
const ALL_STEPS = "all";

function collectSteps(value: unknown, into: Set<string>): void {
  const push = (s: string) =>
    s
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t === ALL_STEPS || (STEP_NAMES as readonly string[]).includes(t))
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

  // Require an explicit step. An empty/unrecognized list used to fall through to
  // a full seed, so one misconfigured caller (e.g. step in the wrong place) could
  // silently run teams/players/fixtures. Fail loud instead; use step=all to opt
  // into the full seed on purpose.
  if (steps.length === 0) {
    return NextResponse.json(
      {
        error:
          "No valid step specified. Pass ?step=<name> (or step in the body), " +
          `comma-separated for several, or step=all for everything. Valid steps: ${STEP_NAMES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const runAll = steps.includes(ALL_STEPS);
  const opts: SeedOptions = {
    teams: runAll || steps.includes("teams"),
    players: runAll || steps.includes("players"),
    fixtures: runAll || steps.includes("fixtures"),
    fixturemap: runAll || steps.includes("fixturemap"),
    coaches: runAll || steps.includes("coaches"),
    rankings: runAll || steps.includes("rankings"),
    standings: runAll || steps.includes("standings"),
    wcstats: runAll || steps.includes("wcstats"),
    live: runAll || steps.includes("live"),
  };

  // cron-job.org caps each ping at 30s, but a wcstats/players seed can take far
  // longer. Acknowledge immediately (202) and run the seed in after(), which on
  // Vercel keeps the function alive past the response (up to maxDuration above).
  // Logs go to the platform console since the caller no longer waits for them.
  const requested = steps.includes(ALL_STEPS) ? ["all"] : steps;
  after(async () => {
    try {
      await runSeed(opts, (m) => console.log(`[seed:${requested.join(",")}] ${m}`));
      console.log(`[seed:${requested.join(",")}] complete`);
    } catch (e) {
      console.error(`[seed:${requested.join(",")}] failed:`, (e as Error).message);
    }
  });

  return NextResponse.json({ ok: true, accepted: requested }, { status: 202 });
}
