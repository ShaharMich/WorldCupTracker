"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Static, always-available silhouette used when a player has no photo or the
// remote photo fails to load — guarantees we never render a broken image.
const SILHOUETTE = "/player-silhouette.svg";

interface Props {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function PlayerPhoto({ src, name, size = 48, className }: Props) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <Image
      src={showFallback ? SILHOUETTE : src}
      alt={showFallback ? `${name} (no photo available)` : name}
      width={size}
      height={size}
      title={name}
      className={cn("rounded-full bg-muted object-cover", className)}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
