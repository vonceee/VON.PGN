export interface Study {
  id: number;
  name: string;
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

export type GlyphId = 1 | 2 | 3 | 4 | 5 | 6;

export const GLYPH_MAPPING: Record<GlyphId, { symbol: string; name: string; class: string }> = {
  1: { symbol: '?!', name: 'Interesting move', class: 'interesting' },
  2: { symbol: '??', name: 'Blunder', class: 'mistake' },
  3: { symbol: '!!', name: 'Brilliant move', class: 'brilliant' },
  4: { symbol: '?', name: 'Inaccuracy', class: 'inaccuracy' },
  5: { symbol: '⊕', name: 'Good move', class: 'good' },
  6: { symbol: '−⊕', name: 'Even better move', class: 'evenbetter' },
};

export interface MoveEval {
  cp?: number; // Centipawns
  mate?: number; // Mate in X
}

export interface MoveNode {
  san: string;
  fen: string;
  uci: string;
  ply: number;
  comments?: string[];
  variations: MoveNode[][]; // Side variations at this position
  children?: MoveNode[]; // Mainline continuation (for tree structure)
  glyphs?: GlyphId[];
  eval?: MoveEval;
  shapes?: any[]; // chessground shapes
  forceVariation?: boolean; // Forced variation display
}

export interface StudyChapter {
  id: number;
  study_id: number;
  name: string;
  initial_fen: string;
  current_fen: string;
  orientation?: 'white' | 'black';
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
