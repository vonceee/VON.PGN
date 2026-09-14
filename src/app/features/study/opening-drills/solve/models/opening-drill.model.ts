import { MoveNode } from '../../../models/study.model';

/**
 * Represents a single compiled move variation sequence in a repertoire chapter.
 */
export interface MovePath {
  id: string;
  moves: MoveNode[];
}

/**
 * Diagnostic record of an incorrect move made during an opening drill.
 */
export interface PracticeMistake {
  id: string;
  chapterIndex: number;
  chapterName: string;
  pathIndex: number;
  moveIndex: number;
  playedMove: string;
  correctMove: string;
  preMistakeFen: string;
  movesBefore: string[];
}

/**
 * Real-time feedback alert data for a mistake made during active drilling.
 */
export interface MistakeAlert {
  played: string;
  correct: string;
  studyId: number | string;
  chapterId: number;
  chapterName: string;
}
