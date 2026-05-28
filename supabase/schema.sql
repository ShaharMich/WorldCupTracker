-- ============================================================
-- FIFA World Cup 2026 Tracker — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================

-- ------------------------------------------------------------
-- 1. API response cache
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);

-- ------------------------------------------------------------
-- 2. Teams (48 national teams)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  logo_url TEXT,
  flag_url TEXT,
  group_code TEXT,
  confederation TEXT,
  wc_appearances INTEGER,
  wc_titles INTEGER DEFAULT 0,
  api_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. Players
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  team_id INTEGER REFERENCES teams(id),
  nationality TEXT,
  position TEXT,
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
  stats_club_season JSONB,
  stats_wc JSONB,
  career_clubs JSONB,
  national_team_caps INTEGER,
  national_team_goals INTEGER,
  wc_appearances INTEGER,
  wc_goals INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);

-- ------------------------------------------------------------
-- 4. Matches
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  kickoff_utc TIMESTAMPTZ NOT NULL,
  stage TEXT,
  group_code TEXT,
  venue TEXT,
  city TEXT,
  country TEXT,
  status TEXT DEFAULT 'NS',
  elapsed INTEGER,
  home_score INTEGER,
  away_score INTEGER,
  home_score_ht INTEGER,
  away_score_ht INTEGER,
  home_score_et INTEGER,
  away_score_et INTEGER,
  home_score_pen INTEGER,
  away_score_pen INTEGER,
  events JSONB,
  stats JSONB,
  lineups JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_utc);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(stage);

-- ------------------------------------------------------------
-- 5. Standings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS standings (
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
  form TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_code, team_id)
);

-- ============================================================
-- Row Level Security
-- Public app reads with the anon key; writes go through the
-- service-role key (which bypasses RLS). So: anon = read-only.
-- ============================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
-- api_cache stays RLS-disabled: only the service role touches it.

DROP POLICY IF EXISTS "public read teams" ON teams;
CREATE POLICY "public read teams" ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read players" ON players;
CREATE POLICY "public read players" ON players FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read matches" ON matches;
CREATE POLICY "public read matches" ON matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read standings" ON standings;
CREATE POLICY "public read standings" ON standings FOR SELECT USING (true);
