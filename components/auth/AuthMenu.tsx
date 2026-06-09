"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Heart } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

// Navbar top-right account control. Logged out → a login icon linking to /login.
// Logged in → an avatar button opening a small dropdown (email + log out).
// Login is always optional; this never blocks the rest of the UI.
export function AuthMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Avoid a flash of the wrong state during the initial session check.
  if (loading) {
    return <span className="size-9 rounded-full" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Log in"
        className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-secondary hover:text-primary"
      >
        <UserIcon className="size-5" />
      </Link>
    );
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105"
      >
        {initial}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-navy-deep/95 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
              <UserIcon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Signed in as</span>
              <span className="block truncate text-sm font-medium">{user.email}</span>
            </span>
          </div>
          <Link
            href="/#favorites"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Heart className="size-4" />
            My Favorites
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.refresh();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
