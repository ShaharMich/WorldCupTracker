"use client";

import Image from "next/image";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  // Tailwind classes for the wrapper (controls aspect ratio / rounding).
  className?: string;
  sizes?: string;
  priority?: boolean;
}

// Renders a stadium photo that fills its wrapper, falling back to a neutral
// placeholder if the (remote Wikimedia) image fails to load.
export function StadiumImage({ src, alt, className, sizes, priority }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {failed ? (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Building2 className="size-10" />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "100vw"}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
          unoptimized
        />
      )}
    </div>
  );
}
