import { Chess } from 'chess.js';
import { GLYPH_MAPPING, GlyphId } from '../../../core/models/study.model';

export const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface ParsedMove {
  san: string;
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  fen: string;
  comment?: string;
  glyph?: { id: GlyphId; symbol: string; name: string };
}

export interface PgnTimelineResult {
  timeline: string[];
  moves: ParsedMove[];
  maxPly: number;
  error: string | null;
}

/**
 * Parses a PGN string into a sequential timeline of FENs, moves, and move annotations.
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

    // Extract comments mapped by FEN
    const commentsMap = new Map<string, string>();
    try {
      const rawComments = chess.getComments();
      if (rawComments && rawComments.length > 0) {
        for (const item of rawComments) {
          if (item && item.fen && item.comment) {
            commentsMap.set(item.fen.trim(), item.comment.trim());
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse PGN comments', e);
    }

    const history = chess.history({ verbose: true });
    const reconstructor = new Chess(initialFen);
    const timeline: string[] = [initialFen];
    const moves: ParsedMove[] = [];

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      reconstructor.move(move.san);
      const moveFen = reconstructor.fen();
      timeline.push(moveFen);

      const moveNumber = Math.floor(i / 2) + 1;
      const color = i % 2 === 0 ? 'w' : 'b';
      let comment = commentsMap.get(moveFen.trim());

      // Parse any embedded glyph symbol from the start of comment or move
      let glyph: { id: GlyphId; symbol: string; name: string } | undefined = undefined;
      if (comment) {
        // Check for glyph bracket/symbol e.g. "[$1]" or "(!)" or prefix
        for (const [idStr, data] of Object.entries(GLYPH_MAPPING)) {
          const id = Number(idStr) as GlyphId;
          const prefix = `[${data.symbol}]`;
          if (comment.startsWith(prefix)) {
            glyph = { id, symbol: data.symbol, name: data.name };
            comment = comment.substring(prefix.length).trim();
            break;
          }
        }
      }

      moves.push({
        san: move.san,
        ply: i + 1,
        moveNumber,
        color,
        fen: moveFen,
        comment: comment || undefined,
        glyph,
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
 * Updates or removes the annotation (comment & glyph) of a move in the PGN at the given ply.
 */
export function updatePgnComment(
  pgnString: string,
  targetPly: number,
  newComment: string,
  glyphId?: GlyphId | null
): string {
  try {
    const chess = new Chess();
    if (pgnString && pgnString.trim()) {
      chess.loadPgn(pgnString);
    } else {
      return pgnString;
    }

    const history = chess.history({ verbose: true });
    if (targetPly <= 0 || targetPly > history.length) {
      return pgnString;
    }

    // Capture existing comments
    const commentsMap = new Map<string, string>();
    try {
      const rawComments = chess.getComments();
      if (rawComments) {
        for (const item of rawComments) {
          if (item?.fen && item.comment) {
            commentsMap.set(item.fen.trim(), item.comment.trim());
          }
        }
      }
    } catch {}

    const headers = chess.header();
    const replay = new Chess();
    for (const [k, v] of Object.entries(headers)) {
      if (v) replay.header(k, v);
    }

    // Build the updated comment with optional glyph prefix
    let finalComment = newComment.trim();
    if (glyphId && GLYPH_MAPPING[glyphId]) {
      const symbol = GLYPH_MAPPING[glyphId].symbol;
      finalComment = `[${symbol}] ${finalComment}`.trim();
    }

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      replay.move(move.san);
      const ply = i + 1;

      if (ply === targetPly) {
        if (finalComment) {
          replay.setComment(finalComment);
        }
      } else {
        const existing = commentsMap.get(move.after.trim());
        if (existing) {
          replay.setComment(existing);
        }
      }
    }

    return replay.pgn();
  } catch (err) {
    console.warn('Failed to update PGN comment', err);
    return pgnString;
  }
}

/**
 * Truncates PGN moves from a specified ply onwards (e.g. undoing or deleting from here).
 */
export function deletePgnMoveFrom(pgnString: string, fromPly: number): string {
  try {
    const chess = new Chess();
    chess.loadPgn(pgnString);
    const history = chess.history({ verbose: true });
    if (fromPly <= 0 || fromPly > history.length) {
      return pgnString;
    }

    const commentsMap = new Map<string, string>();
    try {
      const rawComments = chess.getComments();
      if (rawComments) {
        for (const item of rawComments) {
          if (item?.fen && item.comment) {
            commentsMap.set(item.fen.trim(), item.comment.trim());
          }
        }
      }
    } catch {}

    const replay = new Chess();
    const headers = chess.header();
    for (const [k, v] of Object.entries(headers)) {
      if (v) replay.header(k, v);
    }

    // Replay only up to fromPly - 1
    for (let i = 0; i < fromPly - 1; i++) {
      const move = history[i];
      replay.move(move.san);
      const comment = commentsMap.get(move.after.trim());
      if (comment) {
        replay.setComment(comment);
      }
    }

    return replay.pgn();
  } catch (err) {
    console.warn('Failed to delete moves from PGN', err);
    return pgnString;
  }
}

/**
 * Appends a board move into a PGN string, preserving existing annotations and headers.
 */
export function appendMoveToPgn(
  pgnString: string,
  move: { from: string; to: string; promotion?: string }
): { newPgn: string; san: string; ply: number } | null {
  try {
    const chess = new Chess();
    if (pgnString && pgnString.trim()) {
      chess.loadPgn(pgnString);
    }

    const played = chess.move(move);
    if (!played) return null;

    const newPgn = chess.pgn();
    const history = chess.history();
    return {
      newPgn,
      san: played.san,
      ply: history.length,
    };
  } catch (err) {
    console.warn('Failed to append move to PGN', err);
    return null;
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
