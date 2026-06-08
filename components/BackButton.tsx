"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Mobile-only "← Back" control for detail pages. Hidden at md+ (the navbar is
// enough on larger screens). Goes to the previous history entry.
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:hidden"
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}
