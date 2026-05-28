import Image from "next/image";
import type { Team } from "@/types/team";
import { cn } from "@/lib/utils";

interface Props {
  team: Pick<Team, "name" | "logo_url" | "flag_url"> | null;
  size?: number;
  className?: string;
  fallbackName?: string;
}

export function TeamBadge({ team, size = 24, className, fallbackName }: Props) {
  const src = team?.logo_url || team?.flag_url || null;
  const name = team?.name || fallbackName || "TBD";

  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
        title={name}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn("inline-block object-contain", className)}
      unoptimized
    />
  );
}
