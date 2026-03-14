export type Profile = {
  id: string;
  display_name: string;
  email: string;
  is_admin: boolean;
  handicap: number | null;
  phone: string | null;
  created_at: string;
};

export type Season = {
  id: string;
  name: string;
  year: number;
  is_active: boolean;
  created_at: string;
};

export type Course = {
  id: string;
  name: string;
  city: string;
  holes: number;
  par: number;
};

export type Round = {
  id: string;
  season_id: string;
  course_id: string;
  date: string;
  max_players: number;
  tee_start_time: string;
  tee_interval_minutes: number;
  notes: string | null;
  is_finalized: boolean;
  created_at: string;
  courses?: Course;
  seasons?: Season;
};

export type RoundPlayer = {
  id: string;
  round_id: string;
  player_id: string;
  status: "confirmed" | "waitlist" | "declined";
  tee_time: string | null;
  group_number: number | null;
  rsvp_at: string;
  profiles?: Profile;
};

export type Scorecard = {
  id: string;
  round_id: string;
  player_id: string;
  total_score: number;
  notes: string | null;
  entered_by: string;
  created_at: string;
  profiles?: Profile;
  hole_scores?: HoleScore[];
};

export type HoleScore = {
  id: string;
  scorecard_id: string;
  hole_number: number;
  par: number;
  score: number;
};

export type LeaderboardEntry = {
  player: Profile;
  rounds_played: number;
  total_score: number;
  avg_score: number;
  best_score: number;
};
