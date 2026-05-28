"use client";

import Image from "next/image";
import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function PlayerPhoto({ src, name, size = 48, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
        title={name}
      >
        <User style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
