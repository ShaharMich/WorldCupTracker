import Link from "next/link";
import { Trophy } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-navy-deep/85 backdrop-blur supports-[backdrop-filter]:bg-navy-deep/70">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Trophy className="size-4.5" />
          </span>
          <span className="hidden text-gradient-gold sm:inline">World Cup 2026</span>
          <span className="text-gradient-gold sm:hidden">WC26</span>
        </Link>
        <ul className="flex items-center gap-0.5 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
