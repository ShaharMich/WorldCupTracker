"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { FavoritesProvider } from "@/components/providers/FavoritesProvider";

// Single client boundary mounted in the root layout. Wraps the app in auth +
// favorites context so any client component can read the current user and
// toggle favorites. Auth is always optional — nothing here forces a login.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </AuthProvider>
  );
}
