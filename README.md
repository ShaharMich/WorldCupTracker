# WC 2026 Tracker

A public, mobile-first web app for following the **FIFA World Cup 2026** in full detail, all 48 national teams, complete squad rosters with player stats, every one of the 104 fixtures, live scores, group standings, and the full knockout bracket.

**Live:** [trackwc2026.vercel.app](https://trackwc2026.vercel.app)

## Features

- **Live scores** — real-time match updates with events, stats, and lineups
- **Teams & squads** — all 48 teams by group, full rosters with photos, club stats, and career history
- **Player profiles** — current-season club stats, career timeline, and World Cup tournament stats
- **Fixtures & results** — all 104 matches with filters (live, today, group stage, knockout, by team)
- **Group standings** — live-updating tables for all 12 groups
- **Knockout bracket** — symmetrical two-sided bracket that fills in as groups conclude
- **Top scorers & assisters** — tournament leaderboards
- **Stadiums** — all 16 host venues with photos, capacity, and assigned matches
- **Favorites** — save teams and players (optional email/password login, or stored locally as a guest)

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (dark navy/gold theme)
- **Database:** Supabase (PostgreSQL) — data persistence, caching, and seeding
- **Deployment:** Vercel
- **Mobile (planned):** Capacitor wrap of the Next.js app

## Getting Started

Create a `.env.local` at the project root (see `.env.local.example`) with your Supabase and football API credentials, then run the Supabase schema in `supabase/schema.sql`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Seeding data

```bash
npm run seed                      # all steps
npm run seed -- teams fixtures    # a subset of steps
```

## License

This project is for educational and non-commercial use.
