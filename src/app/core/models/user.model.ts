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

  // Follow stats
  followers_count: number;
  following_count: number;
  is_following: boolean;

  // nested objects keep the database clean and organized
  preferences: UserPreferences;
  progress: UserProgress;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  boardStyle: string;
  pieceStyle: string;
  soundEnabled: boolean;
  soundTheme: string;
}

export interface UserProgress {
  completedLessonIds: string[]; // array of lesson IDs they have finished (e.g., ['rook-01', 'bishop-01'])
  lastActiveLessonId: string | null; // last lesson they were looking at, so you can auto-resume

  currentStreakDays: number;
  experiencePoints: number;
  currentLevel: number;

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
