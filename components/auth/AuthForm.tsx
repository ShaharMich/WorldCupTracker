"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface Props {
  mode: "login" | "signup";
}

// Minimal email + password auth form shared by /login and /signup.
export function AuthForm({ mode }: Props) {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    const result = isSignup
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (isSignup && result.needsConfirmation) {
      setNotice("Check your email to confirm your account, then log in.");
      return;
    }
    // Session is live — favorites migrate automatically. Head home.
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16">
      <Link href="/" className="mb-6 flex items-center gap-2 font-bold tracking-tight">
        <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Trophy className="size-5" />
        </span>
        <span className="text-gradient-gold text-lg">World Cup 2026</span>
      </Link>

      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-xl shadow-navy-deep/30">
        <h1 className="text-xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup
            ? "Sign up to sync your favorite teams and players."
            : "Log in to access your saved favorites."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>

      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:underline">
        Continue as guest
      </Link>
    </div>
  );
}
