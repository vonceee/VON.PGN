export interface UserProfile {
  uid: string; // unique ID from backend
  email: string;
  username: string; // e.g, "yunah_afk, will be for tags e.g, @yunah_afk --unique"
  displayName?: string; // e.g, "Noh Yunah --not unique"
  avatarUrl?: string;
  bio?: string;
  is_admin: string;
  verified_organizer: boolean;
  email_verified_at: string | null;
  createdAt: string;
  country_code?: string;

  // Follow stats
  followers_count: number;
  following_count: number;
  is_following: boolean;

  // Rating data for live chess
  rating: number;
  rating_deviation: number;
  rating_volatility: number;
  games_played: number;
  last_game_at: string | null;

  // Per time control ratings (like lichess)
  ratings?: {
    bullet?: LiveChessRating;
    blitz?: LiveChessRating;
    rapid?: LiveChessRating;
  };

  // nested objects keep the database clean and organized
  preferences: UserPreferences;
  progress: UserProgress;

  // Live status
  is_online?: boolean;
  last_seen_at?: string;

  // Active game preview
  active_game?: ActiveGame;
}

export interface ActiveGame {
  id: string;
  white_player: { id: string; name: string };
  black_player: { id: string; name: string };
  fen: string;
  time_control: string;
  status: string;
}

export interface LiveChessRating {
  rating: number;
  rd: number;
  games: number;
  prov: boolean;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'transparent' | 'system';
  boardStyle: string;
  pieceStyle: string;
  backgroundImage?: string;
  soundEnabled: boolean;
  soundTheme: string;
}

export interface UserProgress {
  completedLessonIds: string[];
  lastActiveLessonId: string | null;

  currentStreakDays: number;
  totalPuzzlesSolved: number;

  puzzleRating: number;
  puzzleStreak: number;

  earnedBadges: Badge[];
}

export interface Badge {
  id: string; // e.g., 'beginner'
  title: string; // e.g., 'Beginner'
  description: string; // e.g., 'completed all piece movement lessons.'
  imageUrl: string; // e.g., '/assets/badges/rook-badge.svg'
  earnedAt: string; // the exact date/time they unlocked it
}

export interface FollowUser {
  uid: string;
  username: string;
  displayName: string;
  is_following: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
