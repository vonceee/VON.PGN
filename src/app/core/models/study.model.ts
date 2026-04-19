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

export interface MoveNode {
  san: string;
  fen: string;
  uci: string;
  ply: number;
  comments?: string[];
  variations: MoveNode[][]; // Array of variation lines, where each line is MoveNode[]
}

export interface StudyChapter {
  id: number;
  study_id: number;
  name: string;
  initial_fen: string;
  current_fen: string;
  moves: string[]; // Keep for backward compatibility or flat view
  move_tree?: MoveNode[]; // Root moves of the mainline
  order: number;
  created_at: string;
  updated_at: string;
}

export interface StudyMoveMadePayload {
  move: string;
  fen: string;
  chapterId: number;
  moves: any[]; // The updated full tree
  userId: string;
}

export interface StudyShapesDrawnPayload {
  shapes: any[]; // chessground shapes
  userId: string;
}

export interface StudySyncedPayload {
  ownerId: string;
  chapterId: number | null;
  fen: string;
  moves: any[];
  shapes: any[];
}
