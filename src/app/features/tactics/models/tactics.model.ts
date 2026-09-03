export interface Puzzle {
  id: number;
  lichess_puzzle_id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string;
  game_url?: string;
  opening_tags?: string;
  popularity?: number;
  nb_plays?: number;
  rating_deviation?: number;
}

export interface SolveResponse {
  success: boolean;
  new_rating: number;
  rating_change: number;
  new_streak: number;
  is_rated?: boolean;
  already_attempted?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
  country_code?: string | null;
}

export interface UserLeaderboardStats {
  rank: number;
  score: number;
  in_top: boolean;
}

export interface PuzzleAttempt {
  id: number;
  puzzle_id: number;
  rating_change: number;
  success: boolean;
  user_id?: number;
  user_rating_after?: number;
  created_at?: string;
  puzzle?: {
    id: number;
    lichess_puzzle_id: string;
    rating: number;
    themes: string;
  };
}

export interface LeaderboardResponse {
  tactics_rating: LeaderboardEntry[];
  streak: LeaderboardEntry[];
  bullet_rating: LeaderboardEntry[];
  blitz_rating: LeaderboardEntry[];
  rapid_rating: LeaderboardEntry[];
  my_stats: {
    tactics_rating: UserLeaderboardStats | null;
    streak: UserLeaderboardStats | null;
    bullet_rating: UserLeaderboardStats | null;
    blitz_rating: UserLeaderboardStats | null;
    rapid_rating: UserLeaderboardStats | null;
  };
}

export interface WoodpeckerSession {
  id: number;
  user_id: number;
  name: string;
  puzzle_ids: number[];
  total_puzzles: number;
  rating_min: number | null;
  rating_max: number | null;
  theme: string | null;
  current_cycle_number: number;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
  cycles: WoodpeckerCycle[];
}

export interface WoodpeckerCycle {
  id: number;
  woodpecker_session_id: number;
  cycle_number: number;
  status: 'in_progress' | 'completed';
  current_puzzle_index: number;
  start_time: string;
  end_time: string | null;
  total_solved: number;
  total_correct: number;
  total_time_seconds: number;
  attempts: WoodpeckerAttempt[];
  created_at: string;
  updated_at: string;
}

export interface WoodpeckerAttempt {
  puzzle_id: number;
  correct: boolean;
  time_spent: number;
  moves: string;
  solved_at: string;
}

export interface WoodpeckerSolveResponse {
  success: boolean;
  cycle_completed: boolean;
  credits_rewarded?: number;
  session: WoodpeckerSession;
  current_cycle: WoodpeckerCycle | null;
  current_puzzle: Puzzle | null;
}
