"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// YouTube/GitHub-style thin gold progress bar for client navigations. The App
// Router exposes no route events, so we start the bar on internal link clicks
// and on back/forward, then complete it when the pathname actually changes.
export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (trickle.current) clearInterval(trickle.current);
    if (safety.current) clearTimeout(safety.current);
    trickle.current = null;
    safety.current = null;
  };

  const finish = useCallback(() => {
    clearTimers();
    setProgress(100);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  }, []);

  const start = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    clearTimers();
    setVisible(true);
    setProgress(8);
    // Trickle toward 90% so the bar keeps moving while the route loads.
    trickle.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p));
    }, 250);
    // Safety net: never leave the bar stuck if a navigation is cancelled.
    safety.current = setTimeout(() => finish(), 10000);
  }, [finish]);

  // Start on internal link clicks and on browser back/forward.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || (target && target !== "_self") || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // No real navigation (same path+query, or hash-only change).
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
    };
  }, [start]);

  // Complete the bar once the new route has rendered.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease 150ms" }}
    >
      <div
        className="h-full bg-gold"
        style={{
          width: `${progress}%`,
          transition: "width 200ms ease",
          boxShadow: "0 0 10px 1px var(--gold), 0 0 4px var(--gold)",
        }}
      />
    </div>
  );
}
