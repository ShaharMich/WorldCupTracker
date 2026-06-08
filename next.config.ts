import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "media-1.api-sports.io" },
      { protocol: "https", hostname: "media-2.api-sports.io" },
      { protocol: "https", hostname: "media-3.api-sports.io" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "www.thesportsdb.com" },
      { protocol: "https", hostname: "r2.thesportsdb.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" }, // stadium photos
    ],
  },
  // Serve ads.txt via an API route (the static public/ads.txt was 404ing).
  async redirects() {
    return [
      {
        source: "/ads.txt",
        destination: "/api/ads",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
