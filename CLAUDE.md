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
- **Styling**: Tailwind CSS v4 (CSS-based config, no `tailwind.config`) + shadcn/ui
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
  wc_appearances INTEGER,
  wc_titles INTEGER DEFAULT 0,
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
```

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

### `/players/[playerId]` — Player Profile
- Large photo, name, nationality flag, jersey number
- Club badge + club name + country
- Stat cards: goals, assists, appearances, avg rating (current club season)
- National team summary: caps, goals, WC appearances, WC goals
- WC 2026 tournament stats (once tournament starts)
- Career timeline: list of clubs with years, matches, goals
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

### `/groups` — Group Standings
- All 12 groups in a responsive grid
- Each group: standings table with Rank / Team / P / W / D / L / GD / Pts
- Color code: top 2 = advance (green), 3rd = conditional (yellow)
- Updates live after each match result

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
3. **players** — `seedPlayersFromApiFootball`: crosswalk teams → pull all 48 squads → drop stale rows → upsert base rows → enrich each player with API-Football detail (bio + 2025/26 club stats) and transfers (career). **Resumable** — re-runs skip players that already have `career_clubs`.
4. **standings** — API-Football `/standings`, with team IDs crosswalked to our football-data team IDs (unmatched entries skipped). Pre-tournament rows are mostly zeros; the `/groups` page still falls back to placeholder rows from the team list when empty.

The seed upserts (`ON CONFLICT DO UPDATE`) so re-runs are safe. Player enrichment spaces TheSportsDB calls (~500ms) for rate limits.

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
- [ ] Project setup (Next.js, Supabase, Tailwind, shadcn)
- [ ] All API clients in `lib/api/`
- [ ] Supabase schema migrations
- [ ] Caching layer
- [ ] Seed script + run it (all 48 teams, squads, players, fixtures)
- [ ] Home page with countdown
- [ ] Teams page + team detail pages
- [ ] Player profile pages
- [ ] Fixtures page (upcoming matches)
- [ ] Groups / standings page (pre-populated, no results yet)
- [ ] Mobile-responsive design throughout
- [ ] Deploy to Vercel

### Phase 2 — During Tournament (June 11+)
- [ ] Live score polling on home + match pages
- [ ] Match detail page with events, stats, lineups
- [ ] Standings auto-update after each match
- [ ] Player WC stats updating in real time
- [ ] Top scorers / golden boot leaderboard
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

# Repair/clean player enrichment against the soccer filter (see Seeding Strategy)
npx tsx scripts/revalidate-enrichment.ts            # all players
npx tsx scripts/revalidate-enrichment.ts enriched   # only already-enriched rows

# Type checking
npm run typecheck   # alias for: tsc --noEmit

# Install shadcn components as needed
npx shadcn@latest add [component]
```

---

## Notes for Claude Code

- Always check Supabase cache before making an external API call
- During seeding, respect API-Football rate limits: the seed sleeps `RATE_LIMIT_MS` (~150ms) between requests; the Pro plan allows 7,500/day
- All times should be stored as UTC in Supabase and displayed in user local time using `Intl.DateTimeFormat`
- The API-Football "status" field values: `NS`=Not Started, `1H`=First Half, `HT`=Half Time, `2H`=Second Half, `ET`=Extra Time, `BT`=Break in Extra Time, `P`=Penalties, `FT`=Full Time, `AET`=After Extra Time, `PEN`=After Penalties, `PST`=Postponed, `CANC`=Cancelled
- Player positions from API-Football: `Goalkeeper`, `Defender`, `Midfielder`, `Attacker`
- Always handle missing/null player photos gracefully with a fallback image
- The seed script is destructive on re-run — add `upsert` logic (ON CONFLICT DO UPDATE) not INSERT
- For the groups page, group code letters come from the API standings endpoint; map them correctly to 'A'–'L'
- Keep all API keys server-side only (route handlers or server components). Never expose them to the client.
