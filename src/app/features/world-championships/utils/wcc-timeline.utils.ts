import { Chess } from 'chess.js';

export const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface ParsedMove {
  san: string;
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
}

export interface PgnTimelineResult {
  timeline: string[];
  moves: ParsedMove[];
  maxPly: number;
  error: string | null;
}

/**
 * Parses a PGN string into a sequential timeline of FENs and formatted move metadata.
 * 
 * WHY: Modularizes chess timeline reconstruction across the detail reader, editor preview,
 *      and analytical tools, preventing duplicate parser logic.
 * 
 * @param pgnString Standard PGN notation text
 * @returns Object containing FEN timeline, structured moves, maxPly, and error if any
 */
export function parsePgnTimeline(pgnString: string): PgnTimelineResult {
  if (!pgnString || !pgnString.trim()) {
    return {
      timeline: [DEFAULT_START_FEN],
      moves: [],
      maxPly: 0,
      error: null,
    };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(pgnString);

    let initialFen = DEFAULT_START_FEN;
    const headers = chess.header();
    if (headers['FEN']) {
      initialFen = headers['FEN'];
    }

    const history = chess.history({ verbose: true });
    const reconstructor = new Chess(initialFen);
    const timeline: string[] = [initialFen];
    const moves: ParsedMove[] = [];

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      reconstructor.move(move.san);
      timeline.push(reconstructor.fen());

      const moveNumber = Math.floor(i / 2) + 1;
      const color = i % 2 === 0 ? 'w' : 'b';
      moves.push({
        san: move.san,
        ply: i + 1,
        moveNumber,
        color,
      });
    }

    return {
      timeline,
      moves,
      maxPly: timeline.length - 1,
      error: null,
    };
  } catch (err: any) {
    return {
      timeline: [DEFAULT_START_FEN],
      moves: [],
      maxPly: 0,
      error: err?.message || 'Invalid PGN format',
    };
  }
}

/**
 * Computes a human-readable move label for the given ply.
 */
export function formatMoveLabel(ply: number, moves: ParsedMove[]): string {
  if (ply === 0) return 'Start';
  const move = moves.find((m) => m.ply === ply);
  if (!move) return `Move ${ply}`;
  return move.color === 'w'
    ? `${move.moveNumber}. ${move.san}`
    : `${move.moveNumber}... ${move.san}`;
}
