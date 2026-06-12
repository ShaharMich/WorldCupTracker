# CLAUDE.md — FIFA World Cup 2026 Tracker

## Project Overview
A public web application (and future mobile app) for tracking the FIFA World Cup 2026 in full detail. Users can explore all 48 national teams, browse complete squad rosters with player photos, current-season club stats, and national team history — then follow all 104 matches from upcoming fixtures through live scores and full post-match stats.

The app is built to be **public-facing** (not just personal), production-grade, and mobile-first from day one. A Capacitor mobile wrap is planned for Phase 2.

**Tournament dates**: June 11 – July 19, 2026  
**Teams**: 48 | **Matches**: 104 | **Groups**: 12 (A–L)  
**Hosts**: USA (11 cities), Canada (2 cities), Mexico (3 cities)

---

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (CSS-based config, no `tailwind.config`) + shadcn/ui. **Theme is a dark navy/blue pitch with gold trophy accents** — all tokens live in `app/globals.css` `:root` (oklch). Extra tokens: `--color-gold`/`gold-bright`, `--color-navy`/`navy-deep`; helper classes `.wc-hero` (gradient hero bg), `.wc-pitch` (stripe sheen, used on the bracket), `.text-gradient-gold` (gold gradient text — **must use `background-image:` not the `background` shorthand**, or the build's wide-gamut fallback rule resets `background-clip` and the text renders as a solid gold box). Cards use `bg-card`, hover lift + `border-primary` glow. **Navbar** shows inline links at `md+` and a hamburger dropdown below `md` (`components/layout/MobileNav.tsx`, a client component; `Navbar` stays a server component). Detail pages (player/match/team/stadium) render a mobile-only `← Back` button (`components/BackButton.tsx`, client, `router.back()`, `md:hidden`) as the first child of the page container — for `space-y` layouts (player page) keep it **outside** that wrapper so `space-y` doesn't add a top gap on desktop. **MatchCard** shows the two team crests (32px) on the left/right with the team names + score/kickoff centred between them (no background-watermark flags); names wrap to a second line rather than truncating. The centre shows the **score** (finished) or **kickoff time** (upcoming). The footer date is controlled by a `showDate` prop (default **true** — home, team & stadium fixtures); `MatchList` (schedule) passes `showDate={false}` because its day-section header already carries the date. Root layout sets `formatDetection: { telephone:false, date:false, … }` so mobile browsers don't auto-link times/dates into highlighted (yellow) tap targets.

**SEO / Open Graph:** `lib/seo.ts` exports `SITE_URL`/`SITE_NAME`/`SITE_DESCRIPTION` and a `pageMetadata({title,description,path})` helper that emits matching `openGraph` + `twitter` (`summary_large_image`) tags; the root layout sets `metadataBase`, title template, and default OG/Twitter. The shared social image is `app/opengraph-image.tsx` — a 1200×630 `next/og` `ImageResponse` (navy/gold, site title + URL) inherited by every route. Major listing pages (`/teams`, `/matches`, `/groups`, `/bracket`, `/stats`, `/stadiums`) use `pageMetadata`. Set `NEXT_PUBLIC_APP_URL` to the production domain so absolute OG URLs resolve (falls back to a vercel URL otherwise).

**TeamCard** no longer shows an in-card group-letter badge — the group header above the grid already labels it.

**Route progress bar:** `components/layout/RouteProgress.tsx` (client, mounted in the root layout) renders a thin gold (`bg-gold`) top bar during client navigations. The App Router has no route events, so it starts on internal `<a>` clicks + `popstate` and completes when `usePathname()` changes (with a 10s safety timeout so it never sticks). **Favicon** is a ⚽ emoji SVG at `app/icon.svg` (the old `favicon.ico` was removed; Next.js App Router auto-serves `icon.svg`).
- **Database**: Supabase (PostgreSQL) — caching, data persistence, seeding
- **Deployment**: Vercel
- **Mobile (Phase 2)**: Capacitor wrapping the Next.js export

> **Build reality (keep in sync):** The project was scaffolded at the **repo root**, not under `src/` — code lives in `app/`, `lib/`, `components/`, `types/`, `scripts/`, `supabase/`, and the `@/*` path alias maps to the repo root (`@/lib/...` = `./lib/...`). Dynamic route `params` are async (`await params`). The structure diagram below is the original plan; treat the actual filesystem as authoritative.

---

## APIs & Data Sources

> **Seed sources (updated 2026-06-07):** **football-data.org is the primary source for teams + fixtures** (its free tier includes the WC competition), and **API-Football (paid Pro plan, season 2026) is now the source for players + standings**. API-Football is also wired for live match events/stats/lineups. football-data.org and API-Football use **different team IDs**, so players are linked to football-data-seeded teams via a name-based **team crosswalk** (`buildTeamCrosswalk` in `lib/seed.ts`); standings team IDs are crosswalked the same way to satisfy the `standings.team_id → teams.id` FK. ⚠️ Do **not** re-seed teams/fixtures from API-Football — the stadium mapping (`MATCH_VENUES`) and `matches↔teams` relations are keyed to football-data match/team IDs.

> **Players are seeded from API-Football (`seedPlayersFromApiFootball`):** for each team (resolved through the crosswalk) it pulls `/players/squads` (jersey #, position, photo, age), then enriches each player with `/players?id&season=2025` (bio, height/weight, 2025/26 club stats aggregated across competitions, current club) and `/transfers` (career history → `career_clubs`). **Resumable** — re-runs skip players that already have `career_clubs`. A stale-row sweep removes any player no longer in a squad. ⚠️ Both the stale sweep and the resume check **paginate via `allRowIds()`** because a Supabase `select()` caps at 1000 rows — without this, cleanup silently misses rows past the cap. TheSportsDB is **retired**; the old `seedPlayersFromFootballData`, `lib/api/thesportsdb.ts`, and `scripts/revalidate-enrichment.ts` are legacy and no longer wired into `runSeed`.

> **Stadiums are hardcoded — football-data's free WC match feed has NO venue field:** there is no per-fixture venue in the API, so `lib/venues.ts` hardcodes the 16 stadiums (name, city, country, capacity, Wikimedia photo `imageUrl`) plus a `MATCH_VENUES` map of football-data match id → stadium for all 104 fixtures. The fixed anchors are correct (Azteca opener, MetLife final, host nations in their own cities); the rest is region-consistent but **flagged in-file as needing verification** against the official FIFA schedule. The `matches.venue`/`city`/`country` columns are populated from this catalog during the fixtures seed.

### Primary: API-Football
- **Provider**: RapidAPI → api-sports/api-football
- **Sign up**: https://rapidapi.com/api-sports/api/api-football
- **Base URL**: `https://v3.football.api-sports.io`
- **Free tier**: 100 requests/day (enough for dev + seeding)
- **Paid**: from $19/month (all endpoints + all competitions included)
- **Auth headers**:
  ```
  x-apisports-key: YOUR_KEY
  ```
- **WC 2026 League ID**: `1` (FIFA World Cup), **Season**: `2026`
- **Key endpoints**:
  ```
  GET /teams?league=1&season=2026           → All 48 WC teams
  GET /players/squads?team={id}             → Squad for a team
  GET /players?team={id}&season=2025        → Player club stats (2025/26 season)
  GET /players?league=1&season=2026         → Player WC stats (once tournament starts)
  GET /fixtures?league=1&season=2026        → All 104 WC fixtures
  GET /fixtures?id={id}&statistics=true     → Single match + full stats
  GET /fixtures/events?fixture={id}         → Match events (goals, cards, subs)
  GET /standings?league=1&season=2026       → Group standings
  GET /transfers?player={id}               → Player transfer history
  GET /trophies?player={id}               → Player trophy history
  ```

### Secondary: football-data.org
- **Sign up**: https://www.football-data.org/client/register
- **Base URL**: `https://api.football-data.org/v4`
- **Free tier**: 10 req/min
- **Auth**: `X-Auth-Token: YOUR_TOKEN`
- **WC Competition code**: `WC`
- **Use for**: Standings, match schedule backup, competition metadata
- **Key endpoints**:
  ```
  GET /competitions/WC/matches             → All WC matches
  GET /competitions/WC/standings           → Group standings
  GET /competitions/WC/teams              → Team list
  GET /competitions/WC/scorers            → Top scorers
  ```

### Tertiary: TheSportsDB
- **Base URL**: `https://www.thesportsdb.com/api/v1/json/3`
- **Free tier**: No sign-up needed for read-only. Use `3` as API key for basic access.
- **Use for**: Supplementary player photos, team badges, player bio info
- **Key endpoints**:
  ```
  GET /searchplayers.php?p={name}         → Player search + photo URL
  GET /lookupplayer.php?id={id}           → Full player profile with image
  GET /search_all_teams.php?c={country}   → Team info + logo
  ```

---

## Environment Variables

Create `.env.local` at project root:

```env
# API-Football (RapidAPI)
API_SPORTS_KEY=your_key_from_api_sports_dashboard
# football-data.org
FOOTBALL_DATA_TOKEN=your_football_data_token

# TheSportsDB (use "3" for free tier)
THESPORTSDB_KEY=3

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Home: overview, countdown, next/live matches
│   ├── layout.tsx                        # Root layout with nav
│   ├── teams/
│   │   ├── page.tsx                      # All 48 teams, organized by group
│   │   └── [teamId]/
│   │       └── page.tsx                  # Team detail: squad, history, fixtures
│   ├── players/
│   │   └── [playerId]/
│   │       └── page.tsx                  # Player profile: stats, career, history
│   ├── matches/
│   │   ├── page.tsx                      # All fixtures/results, with filters
│   │   └── [matchId]/
│   │       └── page.tsx                  # Match detail: lineups, events, stats
│   ├── groups/
│   │   └── page.tsx                      # All 12 groups + standings tables
│   └── api/
│       ├── seed/
│       │   └── route.ts                  # Admin: bulk-seed Supabase with all data
│       ├── matches/
│       │   └── [id]/route.ts             # Proxy live match data
│       └── revalidate/
│           └── route.ts                  # On-demand ISR revalidation
├── components/
│   ├── teams/
│   │   ├── TeamCard.tsx                  # Compact team card (flag, name, group)
│   │   ├── TeamGrid.tsx                  # 48-team grid, grouped by letter
│   │   └── SquadTable.tsx                # Full squad list with player rows
│   ├── players/
│   │   ├── PlayerCard.tsx                # Compact player card
│   │   ├── PlayerHero.tsx                # Large player header with photo
│   │   ├── PlayerStats.tsx               # Current season stats grid
│   │   └── PlayerCareer.tsx              # Career timeline (clubs + years)
│   ├── matches/
│   │   ├── MatchCard.tsx                 # Score/fixture card
│   │   ├── LiveBadge.tsx                 # Pulsing LIVE indicator
│   │   ├── MatchStats.tsx                # Bar chart stats (possession, shots, etc.)
│   │   └── MatchEvents.tsx               # Goal/card/sub timeline
│   ├── groups/
│   │   └── StandingsTable.tsx            # W/D/L/GD/Pts table
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── CountdownTimer.tsx            # Days/hours to opening match
│   └── ui/                               # shadcn/ui components
├── lib/
│   ├── api/
│   │   ├── api-football.ts               # All API-Football calls
│   │   ├── football-data.ts              # football-data.org calls
│   │   └── thesportsdb.ts                # TheSportsDB calls
│   ├── supabase/
│   │   ├── client.ts                     # Browser client
│   │   └── server.ts                     # Server client (service role)
│   ├── cache.ts                          # getCached(key, fetchFn, ttlMinutes)
│   ├── seed.ts                           # Bulk data seeding logic
│   └── utils.ts                          # Helpers, formatters, flag emoji
├── types/
│   ├── team.ts
│   ├── player.ts
│   ├── match.ts
│   └── api.ts                            # Raw API response shapes
└── scripts/
    └── seed.ts                           # Run with: npm run seed
```

---

## Supabase Schema

Run these migrations in order via the Supabase SQL editor:

```sql
-- ============================================================
-- 1. API response cache (reduces API calls drastically)
-- ============================================================
CREATE TABLE api_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);

-- ============================================================
-- 2. Teams (48 national teams)
-- ============================================================
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  logo_url TEXT,
  flag_url TEXT,
  group_code TEXT,            -- 'A' through 'L'
  confederation TEXT,         -- UEFA, CONMEBOL, CAF, etc.
  fifa_rank INTEGER,          -- FIFA world ranking (hardcoded catalog, lib/fifa-rankings.ts)
  wc_appearances INTEGER,
  wc_titles INTEGER DEFAULT 0,
  coach_id INTEGER,           -- API-Football coach id
  coach_name TEXT,            -- current head coach
  coach_photo_url TEXT,       -- media.api-sports.io coach photo
  coach_nationality TEXT,
  api_data JSONB,             -- raw API-Football response
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Players
-- ============================================================
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  team_id INTEGER REFERENCES teams(id),
  nationality TEXT,
  position TEXT,              -- 'Goalkeeper', 'Defender', 'Midfielder', 'Attacker'
  age INTEGER,
  date_of_birth DATE,
  height TEXT,
  weight TEXT,
  jersey_number INTEGER,
  photo_url TEXT,
  club_id INTEGER,
  club_name TEXT,
  club_logo_url TEXT,
  club_country TEXT,
  stats_club_season JSONB,    -- 2025/26 club stats
  stats_wc JSONB,             -- WC 2026 stats (populated during tournament)
  career_clubs JSONB,         -- Array of {club, season, appearances, goals}
  national_team_caps INTEGER,
  national_team_goals INTEGER,
  wc_appearances INTEGER,
  wc_goals INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_position ON players(position);

-- ============================================================
-- 4. Matches
-- ============================================================
CREATE TABLE matches (
  id INTEGER PRIMARY KEY,
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  kickoff_utc TIMESTAMPTZ NOT NULL,
  stage TEXT,                 -- 'Group Stage', 'Round of 32', 'Quarter-final', etc.
  group_code TEXT,            -- null for knockout rounds
  venue TEXT,
  city TEXT,
  country TEXT,               -- 'USA', 'Mexico', 'Canada'
  status TEXT DEFAULT 'NS',   -- 'NS'=Not Started, '1H','HT','2H','ET','PEN','FT'
  elapsed INTEGER,            -- minutes played (for live)
  home_score INTEGER,
  away_score INTEGER,
  home_score_ht INTEGER,      -- half-time score
  away_score_ht INTEGER,
  home_score_et INTEGER,      -- extra time
  away_score_et INTEGER,
  home_score_pen INTEGER,     -- penalties
  away_score_pen INTEGER,
  events JSONB,               -- [{type, team, player, minute, detail}]
  stats JSONB,                -- possession, shots, passes, etc.
  lineups JSONB,              -- starting XI + bench for both teams
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_matches_kickoff ON matches(kickoff_utc);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_stage ON matches(stage);

-- ============================================================
-- 5. Standings (updated after each match)
-- ============================================================
CREATE TABLE standings (
  id SERIAL PRIMARY KEY,
  group_code TEXT NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  rank INTEGER,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  form TEXT,                  -- last 5: 'WWDLW'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_code, team_id)
);

-- ============================================================
-- 6. Favorites (per-user saved teams + players) — requires Supabase Auth
-- Owner-only RLS (auth.uid() = user_id). Run the updated supabase/schema.sql.
-- ============================================================
CREATE TABLE favorites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('team','player')),
  item_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, item_id)
);
```

---

## Auth & Favorites

Optional email/password auth via **Supabase Auth, client-side only** — uses the existing browser client `lib/supabase/client.ts` (default localStorage session); no `@supabase/ssr`, no middleware, no SSR cookies. **Login is always optional — nothing forces it.** Pages `/login` + `/signup` (`components/auth/AuthForm.tsx`); navbar top-right account icon is `components/auth/AuthMenu.tsx`.

Two client contexts mounted via `components/providers/Providers.tsx` in the root layout: **`AuthProvider`** (`useAuth()` → `user/loading/signIn/signUp/signOut`) and **`FavoritesProvider`** (`useFavorites()` → `favorites:Set<"type:id">/ready/isFavorite/toggle`). Guests store favorites in **localStorage** (`wc2026:favorites`); logged-in users in the Supabase **`favorites`** table. On guest→login the local set **auto-migrates** to Supabase (upsert, ignore dupes) then localStorage clears. `lib/favorites.ts` holds the key helpers + localStorage I/O.

`components/favorites/HeartButton.tsx` (filled = favorited) appears on **TeamCard, SquadTable rows, team detail header, PlayerHero**. Cards wrap content in an overlay-`<Link absolute inset-0>` + `pointer-events-none` so the heart (z-10) stays clickable without nesting a `<button>` in an `<a>`. The home page renders a client **`MyFavorites`** section (`#favorites`) that fetches favorited teams/players by id from the browser client.

---

## Caching Strategy

All API calls go through a `getCached()` wrapper that checks Supabase first:

```typescript
// lib/cache.ts
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMinutes: number
): Promise<T>
```

**TTL guidelines**:
| Data type | Cache TTL |
|-----------|-----------|
| Team info | 24 hours |
| Player profiles | 12 hours |
| Club season stats | 6 hours |
| Fixture list | 2 hours |
| Group standings | 30 minutes |
| Live match data | 60 seconds |
| Completed match (full stats) | Forever (no expiry) |

**Rule**: During the tournament, only poll the live endpoint for matches with status `1H`, `HT`, `2H`, `ET`, or `PEN`. All other matches use cached data.

---

## Pages & Feature Spec

### `/` — Home
- WC 2026 branding hero with countdown timer (days/hours/minutes/seconds to June 11)
- "LIVE NOW" section (auto-refreshes every 60s during matches, hidden otherwise)
- Next 5 upcoming matches with kickoff times in local time
- Recent results (last 5 completed matches with scores)
- Quick nav: Teams | Groups | Schedule | Top Scorers

### `/teams` — All Teams
- 12 group sections (A through L), each showing 4 team cards
- TeamCard: flag image, country name, confederation badge
- Click → Team detail

### `/teams/[teamId]` — Team Detail
- Hero: large flag + country name + group badge
- Group standings widget (their group, current table)
- Full squad organized by position (GK / DEF / MID / ATT)
- Each squad row: photo, name, club (with club logo), age, position
- Click player → Player profile
- Team's match schedule: all 3 group matches + knockout path
- Historical stats: WC appearances, best finish, titles
- Head coach: photo, name, nationality (in the team header)

### `/players/[playerId]` — Player Profile
- Large photo, name, nationality flag, jersey number
- Club badge + club name + country
- Stat cards: goals, assists, appearances, avg rating (current club season)
- **WC 2026 tournament stats** (`PlayerWCStats`, shown only when `stats_wc` is populated, after the player's matches): the aggregated total cards (appearances, goals, assists, yellow cards, red cards, minutes played) **plus a per-match "Matches" list** — one row per WC game with opponent (vs/at), local date, and that match's goals/assists/cards/minutes/rating chips (e.g. "vs Czech Republic — 1 G, 1 A, 84′, 8.9"). Both come from `stats_wc` (`stats_wc.matches` for the per-match lines), sourced from the `wcstats` seed step.
- Career timeline: list of clubs with years, matches, goals. Falls back to the current club as a single entry when there's no transfer history (academy products like Yamal), instead of "Career history not available."
- **No National Team stats section** — caps/goals/WC apps/WC goals were removed (the data isn't populated, so it only showed zeros). The `NationalSummary` component is gone.
- Trophy cabinet: club + national team titles

### `/matches` — All Fixtures & Results
- Filter tabs: All / Live / Today / Group Stage / Knockout / By Team
- Date-grouped match cards
- Each card: team flags, team names, score or kickoff time, venue, status badge
- LIVE badge with pulsing green dot

### `/matches/[matchId]` — Match Detail
- Match header: teams, score, status, venue, date
- Live ticker if match in progress (auto-refreshes)
- Match events timeline: goals ⚽, yellow 🟨, red 🟥, substitutions 🔄
- Stats comparison: possession bars, shots, shots on target, passes, fouls, corners
- Lineups: starting XI (formation view or list) + bench for both teams
- Player ratings if available

### `/bracket` — Knockout Bracket
- **Symmetrical two-sided bracket**: each round is split in half — left side runs outer→centre (R32 → R16 → QF → SF), the **Final sits in the centre** with the **Third-place Play-off directly below it**, and the right side mirrors centre→outer (SF → QF → R16 → R32). Columns use `justify-around` so later rounds centre vertically, giving the classic converging-tree look. The left/right split is by fixture order (purely visual pre-tournament, since all slots are TBD).
- Pre-tournament every slot renders **TBD** (the 32 knockout fixtures exist in `matches` with null `home_team_id`/`away_team_id`); each card still shows kickoff time + city/venue and links to the match detail page. Winners + scores fill in automatically once results are seeded.
- Data via `getKnockoutMatches()` (all matches where `stage != 'Group Stage'`). Components: `components/bracket/BracketMatch.tsx` (narrow `w-44` card), page `app/bracket/page.tsx`. Horizontally scrollable (the full tree is wide).

### `/groups` — Group Standings
- All 12 groups in a responsive grid
- Each group: standings table with Rank / Team / P / W / D / L / GD / Pts
- Color code: top 2 = advance (green), 3rd = conditional (yellow)
- Updates live after each match result

### `/stats` — Top Scorers & Assisters
- Two leaderboard tables side by side (`md:grid-cols-2`): **Top Scorers** (goals) and **Top Assisters** (assists), both derived from `players.stats_wc`. Each row: rank, player photo, name (links to the player), national-team crest, club logo, and the stat number.
- Data via `getStatLeaders()` in `lib/queries.ts` (fetches players with non-null `stats_wc`, sorts in JS). **Pre-tournament shows the empty state "Stats will appear after matches kick off on June 11"** (no player has `stats_wc` until the `wcstats` seed step runs after matches). In the navbar.

### `/stadiums` & `/stadiums/[id]` — Stadiums
- Listing: all 16 stadiums grouped by host country, each card with a Wikimedia photo thumbnail, city and capacity.
- Detail: stadium hero photo, city, country, capacity, and every match assigned to it (via the `matches.venue` name).
- Data is fully hardcoded in `lib/venues.ts` (no API). **UI label is "Stadium"; the DB column / code identifiers stay `venue`** (`VenueId`, `getVenue`, `venueForMatch`, `MATCH_VENUES`).

---

## Live Match Polling

```typescript
// On match detail page and home page:
useEffect(() => {
  if (!isLive) return;
  
  const interval = setInterval(async () => {
    const data = await fetchMatchData(matchId);
    setMatchData(data);
    if (data.status === 'FT') clearInterval(interval);
  }, 60_000); // 60 seconds

  return () => clearInterval(interval);
}, [isLive, matchId]);
```

---

## Seeding Strategy

**Before the tournament starts, run the seed script to pre-populate Supabase:**

```bash
npm run seed                      # all steps
npm run seed -- teams fixtures    # only the listed steps (teams, fixtures, players, standings)
```

Prereq: create `.env.local` (see `.env.local.example`) and run `supabase/schema.sql` in the Supabase SQL editor first.

What each step currently does (see `lib/seed.ts`):
1. **teams** — `football-data.org /competitions/WC/teams` → upsert 48 teams; group_code is derived from the group-stage fixtures (the teams endpoint has no group info).
2. **fixtures** — `football-data.org /competitions/WC/matches` → upsert all 104 fixtures (stage/group/status mapped to our schema); **venue/city/country are filled from the hardcoded `lib/venues.ts` catalog** since the feed has no venue field.
3. **fixturemap** — `seedFixtureCrosswalk`: matches our football-data fixtures to API-Football fixtures by team pair (+ kickoff date) and writes `matches.af_fixture_id`, which `refreshMatch` uses for live events/stats/lineups. Skips knockout fixtures whose teams aren't drawn yet — re-run after each round.
4. **rankings** — `seedFifaRankings`: writes each team's FIFA world ranking into `teams.fifa_rank`. **API-Football has no FIFA-ranking endpoint**, so the ranking is a hardcoded catalog in `lib/venues.ts`-style fashion — `lib/fifa-rankings.ts` (`fifaRankFor(name)`), keyed by country name with accent/alias normalization (snapshot: 1 April 2026 list). Teams not in the catalog keep a null rank (no badge). Update the catalog + re-run when FIFA publishes a new monthly list. Surfaced as a gold `#5` badge on `TeamCard` (top-left) and a `FIFA #5` badge in the team detail header (`components/teams/FifaRankBadge.tsx`).
5. **players** — `seedPlayersFromApiFootball`: crosswalk teams → pull all 48 squads → drop stale rows → upsert base rows → enrich each player with API-Football detail (bio + 2025/26 club stats) and transfers (career). **Resumable** — re-runs skip players that already have `career_clubs`. `buildCareer` collapses consecutive duplicate clubs, standardizes each `season` to a year **range** via `withSeasonRanges` (e.g. `2004–2021`, current club `2023–` with a trailing en dash — a club's end year is the next/newer club's start year), and **appends the origin club** (the `out` side of the earliest transfer, which is otherwise dropped since transfers only list clubs joined — rendered open-start like `–2026`); `mapPlayer` corrects `club_name` to the **most recent transfer** when that move is newer than (and differs from) the stats-derived primary club (year ≥ `CLUB_SEASON`) — fixing players whose mid-season move hasn't yet overtaken their old club in minutes. The same corrections are applied to already-seeded rows by `scripts/fix-player-clubs.ts` (no API calls), which also hardcodes curated careers for Messi/Ronaldo/Yamal.
6. **coaches** — `seedCoaches`: per team (via the crosswalk) fetch API-Football `/coachs`, pick the current coach (career entry with `end=null`), and write `coach_name`/`coach_photo_url`/`coach_nationality`/`coach_id` onto the teams row. 48/48 coverage at last run.
7. **standings** — API-Football `/standings`, with team IDs crosswalked to our football-data team IDs (unmatched entries skipped). Pre-tournament rows are mostly zeros; the `/groups` page still falls back to placeholder rows from the team list when empty.
8. **wcstats** — `seedWCPlayerStats`: iterates **API-Football** WC fixtures directly (league=1, season=2026), takes the finished ones (`FT`/`AET`/`PEN`), pulls `/fixtures/players` per fixture, and aggregates each player's tournament totals (appearances, lineups, minutes, goals, assists, yellow/red cards, minutes-weighted rating) into `players.stats_wc`. It also records a **per-match breakdown** in `stats_wc.matches` (newest-first array of `{fixture_id, date, opponent, opponent_id, home, minutes, goals, assists, yellow_cards, red_cards, rating}`), surfaced as the "Matches" list under the WC section on the player profile. The `stats_wc` JSONB shape is typed as `WCStats` (extends `ClubSeasonStats` with the optional `matches[]`) in `types/player.ts`. **Player ids are API-Football ids = our `players.id`, so no crosswalk is needed** (and it sidesteps the fd↔af fixture-id mismatch by never using our match ids). **Idempotent** — re-run after each match to recompute from all completed fixtures. No-op pre-tournament (zero finished fixtures). Surfaced on the player profile via `PlayerWCStats` (`/stats` leaderboards read the same `stats_wc` totals).
9. **live** — `seedLiveMatches`: discovers in-play matches from API-Football (so a match the DB still has as `NS` isn't missed), unions any row the DB already marks live, and calls `refreshMatch` on each (fetch by `af_fixture_id` → write scores/events/stats/lineups). No-op when nothing's in play. Driven every ~2 min by an external pinger (cron-job.org), not GitHub Actions — see below.

The seed upserts (`ON CONFLICT DO UPDATE`) so re-runs are safe. Player enrichment spaces TheSportsDB calls (~500ms) for rate limits.

**Automated seeding — driven by cron-job.org (external pinger), not GitHub Actions:** automation POSTs `/api/seed?step=…` with `Authorization: Bearer ${REVALIDATE_SECRET}` so the site stays current without manual runs. Set up two cron-job.org jobs against the production URL:
- `step=live` every 2 min — refreshes in-play matches' scores/events/stats/lineups so the DB stays fresh for everyone, not just viewers with the page open (gated in-step, so off-hours it's a near-free DB-only no-op).
- `step=wcstats` every 30 min — player WC stats + per-match breakdown + `/stats` leaderboards, recomputed from all finished matches.

⚠️ **The two GitHub Actions workflows (`.github/workflows/wcstats.yml`, `live-refresh.yml`) have their `schedule:` triggers DISABLED (2026-06-12)** and are kept as `workflow_dispatch`-only (manual testing). They were originally the automation path but (a) GitHub enforces a **~5-min minimum** on scheduled workflows so `*/2` couldn't hit a true 2-min cadence, and (b) the **`REVALIDATE_SECRET` Actions secret was never set**, so every scheduled run failed at the secret guard and emailed a failure — every 2 min for live, every 30 min for wcstats. cron-job.org (which the user already runs) replaced both. To re-enable a GitHub workflow: add repo Actions secrets **`REVALIDATE_SECRET`** (match the app env) and optionally **`APP_URL`**, then un-comment its `schedule:` block. Note GitHub workflows run only from the **default branch** and auto-disable after 60 days of inactivity. `wcstats` recomputes from *all* finished fixtures each run and `live` costs ~4 API calls per in-play match — widen intervals if you approach the API-Football daily budget. The match detail page also uses `revalidate = 30` (ISR) plus a 60s in-page client poll while a match is live; `/stats` uses `revalidate = 60`.

**`/api/seed` request contract (`app/api/seed/route.ts`):** `POST` only, `Authorization: Bearer ${REVALIDATE_SECRET}` (else 401). The requested step(s) are read from **both** the query string (`?step=live`) **and** the POST body — JSON (`{"step":"live"}`) or form-encoded (`step=live`), dispatched by `Content-Type` with a JSON-then-form fallback — and merged. Multiple steps: repeat `?step=` or comma-separate (`step=wcstats,live`); arrays accepted in JSON. Unknown tokens are filtered against the valid set (`teams, players, fixtures, fixturemap, coaches, rankings, standings, wcstats, live`). **An empty/unrecognized step list returns `400` and runs nothing** — it no longer falls through to a full seed (that silent default once let a misconfigured caller run teams/players/fixtures). To run everything on purpose, pass **`step=all`**. ⚠️ This contract is for the HTTP route only — the `npm run seed` CLI (`scripts/seed.ts`) calls `runSeed` directly and still defaults to a full seed when given no step args. **Live step is gated:** `seedLiveMatches` first checks the DB (no API cost) for a match kicking off within 2h / still in progress (3h lookback) / already flagged live, and **skips entirely** otherwise; it also catches API-Football quota/rate-limit errors from live discovery and returns a clean no-op instead of a 500.

**fd↔af fixture crosswalk (`fixturemap` step):** our `matches.id` are football-data ids, but API-Football fixtures use unrelated ids. `seedFixtureCrosswalk` matches the two feeds by (unordered) team pair — disambiguated by kickoff date — and stores the AF fixture id on **`matches.af_fixture_id`** (schema migration: `ALTER TABLE matches ADD COLUMN IF NOT EXISTS af_fixture_id INTEGER`). `lib/live.ts` `refreshMatch` then fetches events/stats/lineups by `af_fixture_id` (returning the cached row unchanged when it's null), so live auto-refresh now works for **all** matches. Knockout fixtures with undrawn (null) teams are skipped — **re-run `npm run seed -- fixturemap` after each round is set**. `scripts/fix-mexico-southafrica.ts` remains as a single-match fallback (find AF fixture by team name; opener = id 537327, AF fixture 1489369).

**Repairing enrichment** (`scripts/revalidate-enrichment.ts`): re-checks players against the soccer filter — a soccer match is kept/corrected, a confirmed non-match clears the row (UI falls back to the silhouette), and a transient fetch error **skips** the row (never wipes good data). Pass `enriched` to only re-check already-enriched rows; it retries rate-limited rows across rounds until none remain.

**Rate limiting**: football-data.org free tier = 10 req/min (teams+fixtures is only a few calls). API-Football **Pro plan = 7,500 req/day**; a full player seed is ~2,550 calls (48 squads + ~1,248 players × 2 for detail + transfers). The seed paces calls with a short `sleep` (`RATE_LIMIT_MS`) between requests.

---

## World Cup 2026 Key Facts (Build These In)

- **Opening match**: June 11, 2026 — Mexico City (Estadio Azteca)
- **Final**: July 19, 2026 — MetLife Stadium, New Jersey
- **Format**: 12 groups of 4 → top 2 + 8 best 3rd-place teams advance (32 teams to Round of 32)
- **Group stage matches**: 72 | **Knockout matches**: 32 | **Total**: 104
- **Host cities (USA)**: New York, Los Angeles, Dallas, San Francisco, Miami, Atlanta, Seattle, Boston, Kansas City, Houston, Philadelphia
- **Host cities (Mexico)**: Mexico City, Guadalajara, Monterrey
- **Host cities (Canada)**: Toronto, Vancouver

---

## Image Handling

- **Player photos**: from **API-Football** (`media.api-sports.io`), stored as `players.photo_url` (100% coverage at last seed). The `PlayerPhoto` client component falls back to `public/player-silhouette.svg` on null/error, so a broken image never shows.
- **Coach photos**: from **API-Football** (`media.api-sports.io/football/coachs/...`), stored as `teams.coach_photo_url`; rendered on the team detail page with the same `PlayerPhoto` silhouette fallback.
- **Team logos / crests**: `team.crest` from football-data.org (`crests.football-data.org`).
- **Country flags**: `https://flagcdn.com/w{width}/{code}.png` (free, no API key) via `flagUrl()` in `lib/utils.ts`.
- **Stadium photos**: hardcoded Wikimedia Commons URLs (`upload.wikimedia.org`) in `lib/venues.ts`, rendered by the `StadiumImage` client component (with an `onError` placeholder).
- **Next.js config**: hostnames live in `next.config.ts` (note: `.ts`, not `.js`) `images.remotePatterns` — keep new image hosts in sync there. Images are rendered `unoptimized`.

```ts
// next.config.ts — images.remotePatterns hostnames
media.api-sports.io / media-{1,2,3}.api-sports.io  // API-Football (future)
flagcdn.com                                         // country flags
crests.football-data.org                            // team crests
www.thesportsdb.com / r2.thesportsdb.com            // player photos
upload.wikimedia.org                                // stadium photos
```

---

## Development Phases

### Phase 1 — Pre-Tournament (Build Now, Before June 11)
- [x] Project setup (Next.js, Supabase, Tailwind, shadcn)
- [x] All API clients in `lib/api/`
- [x] Supabase schema migrations
- [x] Caching layer
- [x] Seed script + run it (all 48 teams, squads, players, fixtures)
- [x] Home page with countdown
- [x] Teams page + team detail pages
- [x] Player profile pages
- [x] Fixtures page (upcoming matches)
- [x] Groups / standings page (pre-populated, no results yet)
- [x] Mobile-responsive design throughout (hamburger nav, mobile back button)
- [ ] Deploy to Vercel
- [x] Extra pages built: Stadiums (`/stadiums`), Knockout Bracket (`/bracket`), Top Scorers & Assisters (`/stats`)
- [x] Navy/gold theme, ⚽ favicon, SEO/Open Graph + dynamic OG image, route progress bar

### Phase 2 — During Tournament (June 11+)
- [~] Live score polling (match detail page polls; home shows a live section) — `lib/live.ts` `refreshMatch`
- [x] Match detail page with events, stats, lineups (`components/matches/MatchDetail`)
- [ ] Standings auto-update after each match (manual `wcstats`/`standings` seed steps for now)
- [x] Player WC stats (`seedWCPlayerStats` → `players.stats_wc`, shown on profile + `/stats`)
- [x] Top scorers / golden boot leaderboard (`/stats`)
- [ ] Push notifications (Vercel + web push API) — optional

### Phase 3 — Mobile App (Capacitor)
- [ ] Ensure all pages are mobile-first
- [ ] Add Capacitor + configure for iOS/Android
- [ ] Test on physical devices
- [ ] Submit to App Store / Play Store

---

## Commands

```bash
# Development
npm run dev

# Build & start
npm run build && npm start

# Seed Supabase (all steps, or pass a subset: teams fixtures players standings)
npm run seed
npm run seed -- teams fixtures
npm run seed -- players            # resumable: skips already-enriched players
npm run seed -- coaches            # current head coach (name, photo, nationality) per team
npm run seed -- rankings           # FIFA world ranking per team (hardcoded catalog -> teams.fifa_rank)
npm run seed -- fixturemap         # crosswalk fd<->af fixtures -> matches.af_fixture_id (needed for live refresh; re-run after knockout draws)
npm run seed -- wcstats            # aggregate WC 2026 player stats from finished fixtures (run after each match)
npm run seed -- live               # refresh all in-play matches from API-Football (driven every ~2 min by live-refresh.yml)

# Backfill one match's events/stats/lineups from API-Football (works around the
# fd<->af fixture-id mismatch by matching the fixture on team name). Currently
# wired for the opener (Mexico vs South Africa, our id 537327):
npx tsx scripts/fix-mexico-southafrica.ts

# Repair/clean player enrichment against the soccer filter (see Seeding Strategy)
npx tsx scripts/revalidate-enrichment.ts            # all players
npx tsx scripts/revalidate-enrichment.ts enriched   # only already-enriched rows

# Repair player current-club + career data already in Supabase (no API calls):
#   - collapse consecutive duplicate clubs in career_clubs
#   - correct club_name when the latest career entry is newer than it
#   - hardcode curated careers for Messi / Ronaldo / Yamal
npx tsx scripts/fix-player-clubs.ts

# Backfill missing club logos (players with a club_name but null club_logo_url) by
# recomputing each player's club from API-Football detail + transfers (shared
# currentClubFrom resolver). Lookup-by-name is unreliable, so we re-derive the id.
npx tsx scripts/fix-club-logos.ts

# Standardize career_clubs seasons to year ranges ("2004–2021", current "2023–")
# via the shared withSeasonRanges helper; also hardcodes Pedri (no transfer feed).
npx tsx scripts/fix-career-format.ts

# Fill missing previous clubs for single-entry careers of under-28 players by
# re-deriving from transfers (buildCareer now also appends the origin `out` club).
# Hardcodes Oscar Bobb's Manchester City (2022–2026).
npx tsx scripts/fix-missing-careers.ts

# Type checking
npm run typecheck   # alias for: tsc --noEmit

# Install shadcn components as needed
npx shadcn@latest add [component]
```

---

## Notes for Claude Code

- Always check Supabase cache before making an external API call
- During seeding, respect API-Football rate limits: the seed sleeps `RATE_LIMIT_MS` (~150ms) between requests; the Pro plan allows 7,500/day
- All times are stored as UTC in Supabase and shown in the **visitor's local time zone** via the **`components/LocalTime.tsx`** client component (`mode="time"|"datetime"|"day"`). It must be a client component because server components render in the server's zone (UTC on Vercel), which would be wrong for everyone else. SSR/first paint use a deterministic en-US/UTC value, then `useEffect` swaps to the local zone (no hydration mismatch). Use `LocalTime` for any new timestamp display — don't format times directly in a server component.
- Opening-match countdown target is `WC.openingMatchUtc` in `lib/constants.ts` (`2026-06-11T19:00:00Z`, Mexico vs South Africa) and the matching fixture row (`matches.id 537327`) is the same `19:00Z` — keep the two in sync if the official kickoff changes.
- The API-Football "status" field values: `NS`=Not Started, `1H`=First Half, `HT`=Half Time, `2H`=Second Half, `ET`=Extra Time, `BT`=Break in Extra Time, `P`=Penalties, `FT`=Full Time, `AET`=After Extra Time, `PEN`=After Penalties, `PST`=Postponed, `CANC`=Cancelled
- Player positions from API-Football: `Goalkeeper`, `Defender`, `Midfielder`, `Attacker`
- Always handle missing/null player photos gracefully with a fallback image
- The seed script is destructive on re-run — add `upsert` logic (ON CONFLICT DO UPDATE) not INSERT
- For the groups page, group code letters come from the API standings endpoint; map them correctly to 'A'–'L'
- Keep all API keys server-side only (route handlers or server components). Never expose them to the client.
