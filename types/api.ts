// Raw API-Football (v3) response shapes — only the fields we consume.

export interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

export interface AFTeamEntry {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    founded: number | null;
    national: boolean;
    logo: string | null;
  };
  venue?: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
}

export interface AFSquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
}

export interface AFSquadResponse {
  team: { id: number; name: string; logo: string | null };
  players: AFSquadPlayer[];
}

export interface AFPlayerStatistics {
  team: { id: number; name: string; logo: string | null };
  league: { id: number; name: string; country: string | null; season: number };
  games: {
    appearences: number | null;
    lineups: number | null;
    minutes: number | null;
    position: string | null;
    rating: string | null;
    number: number | null;
  };
  goals: {
    total: number | null;
    assists: number | null;
    conceded: number | null;
    saves: number | null;
  };
  cards: { yellow: number | null; red: number | null };
}

export interface AFPlayerResponse {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    age: number | null;
    birth: { date: string | null; place: string | null; country: string | null };
    nationality: string | null;
    height: string | null;
    weight: string | null;
    photo: string | null;
  };
  statistics: AFPlayerStatistics[];
}

export interface AFCoachCareer {
  team: { id: number | null; name: string | null; logo: string | null };
  start: string | null;
  end: string | null; // null = current role
}

export interface AFCoach {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  nationality: string | null;
  photo: string | null;
  team: { id: number | null; name: string | null } | null;
  career: AFCoachCareer[] | null;
}

export interface AFTransferMove {
  date: string | null;
  type: string | null; // fee or "Free"/"Loan"
  teams: {
    in: { id: number | null; name: string | null; logo: string | null };
    out: { id: number | null; name: string | null; logo: string | null };
  };
}

export interface AFTransferResponse {
  player: { id: number; name: string };
  update: string;
  transfers: AFTransferMove[];
}

export interface AFFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string | null; winner: boolean | null };
    away: { id: number; name: string; logo: string | null; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface AFStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string | null };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export interface AFStandingsResponse {
  league: {
    id: number;
    name: string;
    season: number;
    standings: AFStandingEntry[][];
  };
}

export interface AFFixtureStatistics {
  team: { id: number; name: string; logo: string | null };
  statistics: { type: string; value: number | string | null }[];
}

export interface AFFixtureEvent {
  time: { elapsed: number | null; extra: number | null };
  team: { id: number; name: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
}

export interface AFLineupEntry {
  team: { id: number; name: string; logo: string | null };
  coach: { id: number | null; name: string | null };
  formation: string | null;
  startXI: { player: { id: number | null; name: string; number: number | null; pos: string | null; grid: string | null } }[];
  substitutes: { player: { id: number | null; name: string; number: number | null; pos: string | null; grid: string | null } }[];
}
