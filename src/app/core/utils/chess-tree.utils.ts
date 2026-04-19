import { Chess } from 'chess.js';
import { MoveNode } from '../models/study.model';

/**
 * Converts a list of moves (either as a flat string array or a nested MoveNode tree)
 * into a standard MoveNode[] tree structure.
 */
export function buildTreeFromMoves(moves: any, initialFen?: string): MoveNode[] {
  if (!moves) return [];

  let processedMoves = moves;

  // Handle JSON string if coming from a raw database field
  if (typeof moves === 'string' && moves !== '') {
    try {
      processedMoves = JSON.parse(moves);
    } catch (e) {
      console.error('[ChessTreeUtils] Failed to parse moves JSON:', moves);
      return [];
    }
  }

  // 1. Check for PGN object format (highest priority for imported studies)
  if (
    typeof processedMoves === 'object' &&
    processedMoves !== null &&
    'pgn' in processedMoves
  ) {
    const chess = new Chess(initialFen);
    const pgnString = processedMoves.pgn as string;
    
    try {
      chess.loadPgn(pgnString);
      const history = chess.history({ verbose: true });
      const nodes: MoveNode[] = [];
      const tempChess = new Chess(initialFen);
      
      history.forEach((m, i) => {
        tempChess.move(m.san);
        nodes.push({
          san: m.san,
          uci: m.from + m.to,
          fen: tempChess.fen(),
          ply: i + 1,
          variations: [],
        });
      });
      return nodes;
    } catch (e) {
      console.error('[ChessTreeUtils] Failed to parse PGN string:', e);
      return [];
    }
  }

  if (!processedMoves || (Array.isArray(processedMoves) && processedMoves.length === 0)) {
    return [];
  }

  // If the first element is already a MoveNode object, assume it's already a tree
  if (
    Array.isArray(processedMoves) &&
    processedMoves.length > 0 &&
    typeof processedMoves[0] === 'object' &&
    processedMoves[0] !== null &&
    'san' in processedMoves[0]
  ) {
    return processedMoves as MoveNode[];
  }

  // Convert legacy flat string lists (PGN slices) to the modern tree structure
  const rootNodes: MoveNode[] = [];
  const chess = new Chess(initialFen);

  processedMoves.forEach((san: string, index: number) => {
    try {
      const m = chess.move(san);
      if (m) {
        rootNodes.push({
          san: m.san,
          uci: m.from + m.to,
          fen: chess.fen(),
          ply: index + 1,
          variations: [],
        });
      }
    } catch (e) {
      rootNodes.push({
        san: san,
        uci: '',
        fen: '',
        ply: index + 1,
        variations: [],
      });
    }
  });

  return rootNodes;
}
