import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/seo";

// Globally-inherited 1200×630 social preview image (Open Graph + Twitter).
// Navy/gold World Cup theme with the site title and URL.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FIFA World Cup 2026 Tracker";

export default function OpengraphImage() {
  const host = SITE_URL.replace(/^https?:\/\//, "");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1020 0%, #16213e 55%, #20305a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#f6c453",
          }}
        >
          FIFA World Cup
        </div>
        <div style={{ fontSize: 200, fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>2026</div>
        <div style={{ fontSize: 32, marginTop: 24, color: "#cbd5e1" }}>USA · Canada · Mexico</div>
        <div style={{ fontSize: 28, marginTop: 40, color: "#f6c453" }}>{host}</div>
      </div>
    ),
    size,
  );
}
