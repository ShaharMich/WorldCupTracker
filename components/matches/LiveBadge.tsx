export function LiveBadge({ elapsed }: { elapsed?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600/15 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      </span>
      LIVE{typeof elapsed === "number" ? ` ${elapsed}'` : ""}
    </span>
  );
}
