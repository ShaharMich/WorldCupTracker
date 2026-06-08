import type { Metadata } from "next";

// Canonical site URL for absolute metadata (OG/Twitter). Prefer the deployed URL
// from env; fall back to a sensible default so links still resolve in preview.
const raw = process.env.NEXT_PUBLIC_APP_URL;
export const SITE_URL =
  raw && !raw.includes("localhost") ? raw : "https://wc2026-tracker.vercel.app";

export const SITE_NAME = "FIFA World Cup 2026 Tracker";
export const SITE_DESCRIPTION =
  "Track all 48 teams, 104 matches, squads, live scores, group standings and the knockout bracket for the FIFA World Cup 2026.";

// Per-page metadata with matching Open Graph + Twitter tags so shared links get a
// rich preview card. The OG/Twitter image is provided globally by
// app/opengraph-image.tsx (1200×630), so we don't set images here.
export function pageMetadata({
  title,
  description,
  path = "/",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const fullTitle = `${title} · World Cup 2026`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
