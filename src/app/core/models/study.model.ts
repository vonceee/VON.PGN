export interface Study {
  id: number;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  user_id: number;
  owner: {
    id: number;
    name: string;
  };
  chapters_count: number;
  chapters?: StudyChapter[];
  created_at: string;
  updated_at: string;
}

export interface StudyChapter {
  id: number;
  study_id: number;
  name: string;
  initial_fen: string;
  current_fen: string;
  moves: string[];
  order: number;
  created_at: string;
  updated_at: string;
}

export interface StudyMoveMadePayload {
  move: string;
  fen: string;
  chapterId: number;
  userId: string;
}

export interface StudyShapesDrawnPayload {
  shapes: any[]; // chessground shapes
  userId: string;
}

export interface StudySyncedPayload {
  ownerId: string;
  currentChapterId: number | null;
  fen: string;
  moves: string[];
  shapes: any[];
}
