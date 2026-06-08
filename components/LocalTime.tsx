"use client";

import { useEffect, useState } from "react";

type Mode = "time" | "datetime" | "day";

function format(utc: string, mode: Mode, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions =
    mode === "time"
      ? { hour: "numeric", minute: "2-digit" }
      : mode === "day"
        ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
        : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  if (timeZone) opts.timeZone = timeZone;
  // Locale pinned to en-US only for the deterministic SSR / first-paint value so
  // hydration matches; the post-mount render uses the visitor's own locale.
  return new Intl.DateTimeFormat(timeZone ? "en-US" : undefined, opts).format(new Date(utc));
}

// Renders a UTC timestamp in the visitor's local browser time zone. Times are
// stored as UTC; only the browser knows the user's zone, so formatting must
// happen client-side (server components otherwise render in the server's zone).
export function LocalTime({ utc, mode = "time" }: { utc: string; mode?: Mode }) {
  // SSR + first client render share a deterministic en-US/UTC value to avoid a
  // hydration mismatch; useEffect then swaps in the visitor's local zone.
  const [text, setText] = useState(() => format(utc, mode, "UTC"));
  useEffect(() => {
    setText(format(utc, mode));
  }, [utc, mode]);
  return (
    <time dateTime={utc} suppressHydrationWarning>
      {text}
    </time>
  );
}
