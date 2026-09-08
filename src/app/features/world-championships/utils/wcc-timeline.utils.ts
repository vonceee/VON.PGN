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
  hasBreak?: boolean;
}

export interface PgnTimelineResult {
  timeline: string[];
  moves: ParsedMove[];
  maxPly: number;
  error: string | null;
  startComment?: string;
}

/**
 * Extracts raw comments associated with FENs from a PGN string,
 * completely preserving newlines, carriage returns, and indentation.
 */
function extractFenCommentsWithNewlines(pgnString: string): {
  commentsMap: Map<string, string>;
  initialFen: string;
} {
  const commentsMap = new Map<string, string>();
  let initialFen = DEFAULT_START_FEN;

  try {
    const chess = new Chess();
    if (pgnString && pgnString.trim()) {
      chess.loadPgn(pgnString);
    }
    const headers = chess.header();
    if (headers['FEN']) {
      initialFen = headers['FEN'];
    }

    const replay = new Chess();
    replay.load(initialFen);

    // Skip PGN header section
    const headerEnd = pgnString.lastIndexOf(']\n');
    const body = headerEnd !== -1 ? pgnString.substring(headerEnd + 2) : pgnString;

    // Match comments {...}, variations (...), or non-space tokens
    const tokenRegex = /\{([\s\S]*?)\}|(\([^\)]*\))|([^\s{}()]+)/g;
    let match: RegExpExecArray | null;
    let currentFen = replay.fen();

    while ((match = tokenRegex.exec(body)) !== null) {
      if (match[1] !== undefined) {
        // Comment block found
        const commentContent = match[1].replace(/\r\n/g, '\n').trim();
        commentsMap.set(currentFen.trim(), commentContent);
      } else if (match[3] !== undefined) {
        const token = match[3];
        if (/^[0-9]+\.*$/.test(token) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
          continue;
        }
        try {
          const played = replay.move(token);
          if (played) {
            currentFen = replay.fen();
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Failed to extract raw comments with newlines', err);
  }

  return { commentsMap, initialFen };
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

    const { commentsMap, initialFen } = extractFenCommentsWithNewlines(pgnString);

    // Start comment (pre-comment before move 1 at initial position)
    const startComment = commentsMap.get(initialFen.trim());

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

      let hasBreak = false;
      if (comment && comment.includes('[%break]')) {
        hasBreak = true;
        comment = comment.replace(/\[%break\]/g, '').trim();
      }

      // Parse any embedded glyph symbol from the start of comment or move
      let glyph: { id: GlyphId; symbol: string; name: string } | undefined = undefined;
      if (comment) {
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
        hasBreak,
      });
    }

    return {
      timeline,
      moves,
      maxPly: timeline.length - 1,
      error: null,
      startComment: startComment || undefined,
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
 * Updates or removes the annotation (comment, glyph, breakline) of a move in the PGN at the given ply.
 * When targetPly === 0, updates the pre-game comment (startComment).
 */
export function updatePgnComment(
  pgnString: string,
  targetPly: number,
  newComment: string,
  glyphId?: GlyphId | null,
  hasBreak?: boolean
): string {
  try {
    const chess = new Chess();
    if (pgnString && pgnString.trim()) {
      chess.loadPgn(pgnString);
    } else {
      return pgnString;
    }

    const { commentsMap, initialFen } = extractFenCommentsWithNewlines(pgnString);
    const history = chess.history({ verbose: true });

    if (targetPly < 0 || targetPly > history.length) {
      return pgnString;
    }

    const replay = new Chess();
    const headers = chess.header();
    for (const [k, v] of Object.entries(headers)) {
      if (v) replay.header(k, v);
    }
    replay.load(initialFen);

    // Format comment payload helper
    const buildCommentString = (
      text: string,
      gId?: GlyphId | null,
      brk?: boolean
    ): string => {
      const parts: string[] = [];
      if (brk) parts.push('[%break]');
      if (gId && GLYPH_MAPPING[gId]) {
        parts.push(`[${GLYPH_MAPPING[gId].symbol}]`);
      }
      if (text && text.trim()) {
        parts.push(text.trim());
      }
      return parts.join(' ').trim();
    };

    // Handle targetPly === 0 (Pre-Game / Start Comment)
    let startComment = commentsMap.get(initialFen.trim()) || '';
    if (targetPly === 0) {
      startComment = newComment.trim();
    }
    if (startComment) {
      replay.setComment(startComment);
    }

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      replay.move(move.san);
      const ply = i + 1;

      if (ply === targetPly) {
        const commentToSet = buildCommentString(newComment, glyphId, hasBreak);
        if (commentToSet) {
          replay.setComment(commentToSet);
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
