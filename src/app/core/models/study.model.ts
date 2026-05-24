import { UserProfile } from './user.model';

export interface StudyCollaborator extends UserProfile {
  can_edit: boolean;
  is_syncing: boolean;
}

export interface Study {
  id: number;
  name: string;
  visibility: 'public' | 'private' | 'unlisted';
  engine_visibility: 'everyone' | 'owner';
  category?: 'general' | 'opening_repertoire';
  orientation?: 'white' | 'black';
  user_id: number;
  owner: {
    id: number;
    name: string;
  };
  collaborators?: StudyCollaborator[];
  chapters_count: number;
  chapters?: StudyChapter[];
  created_at: string;
  updated_at: string;
}

export type GlyphId = number;

export const GLYPH_MAPPING: Record<number, { symbol: string; name: string; class: string }> = {
  // Move Evaluations
  1: { symbol: '!', name: 'Good move', class: 'good' },
  2: { symbol: '?', name: 'Mistake', class: 'mistake' },
  3: { symbol: '!!', name: 'Brilliant move', class: 'brilliant' },
  4: { symbol: '??', name: 'Blunder', class: 'blunder' },
  5: { symbol: '!?', name: 'Interesting move', class: 'interesting' },
  6: { symbol: '?!', name: 'Dubious move', class: 'dubious' },
  7: { symbol: '□', name: 'Only move', class: 'only-move' },
  22: { symbol: '⊙', name: 'Zugzwang', class: 'zugzwang' },

  // Positional Evaluations
  10: { symbol: '=', name: 'Equal position', class: 'equal' },
  13: { symbol: '∞', name: 'Unclear position', class: 'unclear' },
  14: { symbol: '⩲', name: 'White is slightly better', class: 'white-slightly-better' },
  15: { symbol: '⩱', name: 'Black is slightly better', class: 'black-slightly-better' },
  16: { symbol: '±', name: 'White is better', class: 'white-better' },
  17: { symbol: '∓', name: 'Black is better', class: 'black-better' },
  18: { symbol: '+-', name: 'White is winning', class: 'white-winning' },
  19: { symbol: '-+', name: 'Black is winning', class: 'black-winning' },

  // Technical Markers
  146: { symbol: 'N', name: 'Novelty', class: 'novelty' },
  32: { symbol: '↑↑', name: 'Development', class: 'development' },
  36: { symbol: '↑', name: 'Initiative', class: 'initiative' },
  40: { symbol: '→', name: 'Attack', class: 'attack' },
  132: { symbol: '⇆', name: 'Counterplay', class: 'counterplay' },
  138: { symbol: '⊕', name: 'Time trouble', class: 'time-trouble' },
  44: { symbol: '=∞', name: 'With compensation', class: 'compensation' },
  140: { symbol: 'Δ', name: 'With the idea', class: 'idea' },
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
  preComments?: string[];
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
  variant?: string;
  moves: string[]; // Keep for backward compatibility or flat view
  move_tree?: MoveNode[]; // Root moves of the mainline
  order: number;
  pgn_tags?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface StudyMoveMadePayload {
  move: string;
  fen: string;
  chapterId: number;
  moves: any[]; // The updated full tree
  userId: string;
  orientation?: 'white' | 'black';
  clientGeneratedId?: string;
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
  orientation?: 'white' | 'black';
}
