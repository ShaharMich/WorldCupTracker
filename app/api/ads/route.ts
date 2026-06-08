// Serves the AdSense ads.txt content as plain text. /ads.txt redirects here
// (see next.config.ts) since the static public/ads.txt was returning 404.
export const dynamic = "force-static";

export function GET() {
  return new Response(
    "google.com, pub-2615414338437959, DIRECT, f08c47fec0942fa0\n",
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
