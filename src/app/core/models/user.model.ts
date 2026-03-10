export interface UserProfile {
  uid: string; // unique ID from backend
  email: string;
  username: string; // e.g, "yunah_afk, will be for tags e.g, @yunah_afk --unique"
  displayName?: string; // e.g, "Noh Yunah --not unique"
  avatarUrl?: string;
  createdAt: string;

  // nested objects keep the database clean and organized
  preferences: UserPreferences;
  progress: UserProgress;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  boardStyle: 'classic' | 'modern' | 'antigravity';
  pieceStyle: 'standard' | 'minimalist';
  soundEnabled: boolean;
}

export interface UserProgress {
  completedLessonIds: string[]; // array of lesson IDs they have finished (e.g., ['rook-01', 'bishop-01'])
  lastActiveLessonId: string | null; // last lesson they were looking at, so you can auto-resume

  currentStreakDays: number;
  experiencePoints: number;
  currentLevel: number;
  puzzleRating: number;
  earnedBadges: Badge[];
}

export interface Badge {
  id: string; // e.g., 'beginner'
  title: string; // e.g., 'Beginner'
  description: string; // e.g., 'completed all piece movement lessons.'
  imageUrl: string; // e.g., '/assets/badges/rook-badge.svg'
  earnedAt: string; // the exact date/time they unlocked it
}
