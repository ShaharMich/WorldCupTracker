"use client";

import { useEffect, useState } from "react";

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function diff(target: number): Parts {
  const ms = target - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: false,
  };
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular-nums text-3xl font-bold sm:text-5xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs uppercase tracking-wide text-muted-foreground sm:text-sm">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer({ targetUtc }: { targetUtc: string }) {
  const target = new Date(targetUtc).getTime();
  // Start null to keep SSR/CSR markup identical and avoid hydration mismatch.
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(diff(target));
    const id = setInterval(() => setParts(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (parts?.done) {
    return <p className="text-2xl font-bold">The tournament is underway! ⚽</p>;
  }

  const p = parts ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className="flex items-center gap-4 sm:gap-8" suppressHydrationWarning>
      <Cell value={p.days} label="Days" />
      <Cell value={p.hours} label="Hours" />
      <Cell value={p.minutes} label="Mins" />
      <Cell value={p.seconds} label="Secs" />
    </div>
  );
}
