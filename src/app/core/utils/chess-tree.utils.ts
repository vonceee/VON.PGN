import { Chess } from 'chess.js';
import { MoveNode } from '../models/study.model';

/**
 * Validates and normalizes a MoveNode to ensure all properties are correct types
 */
function normalizeMoveNode(node: any): MoveNode {
  if (!node || typeof node !== 'object') {
    throw new Error('Invalid node: must be an object');
  }

  // Ensure all string properties are actually strings
  const san = String(node.san || '');
  const uci = String(node.uci || '');
  const fen = String(node.fen || '');
  const ply = parseInt(String(node.ply || 0), 10);

  // Validate FEN if it exists
  if (fen && fen.trim()) {
    const fenParts = fen.split(' ');
    if (fenParts.length !== 6) {
      console.warn(`[ChessTreeUtils] Invalid FEN: ${fen}`);
      throw new Error(`Invalid FEN format: "${fen}"`);
    }
  }

  // Recursively normalize variations (2D array)
  let variations: MoveNode[][] = [];
  if (Array.isArray(node.variations)) {
    variations = node.variations
      .map((variation: any) => {
        if (!Array.isArray(variation)) return [];
        return variation
          .map((v: any) => normalizeMoveNode(v))
          .filter((v: any) => v !== null);
      })
      .filter((v: any) => v.length > 0);
  }

  return {
    san,
    uci,
    fen,
    ply,
    variations,
    comments: Array.isArray(node.comments) ? node.comments.map(String) : [],
  };
}

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
          comments: [],
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

  // 2. If the first element is already a MoveNode object, normalize and return it
  if (
    Array.isArray(processedMoves) &&
    processedMoves.length > 0 &&
    typeof processedMoves[0] === 'object' &&
    processedMoves[0] !== null &&
    'san' in processedMoves[0]
  ) {
    try {
      return processedMoves.map((node: any) => normalizeMoveNode(node));
    } catch (e) {
      console.error('[ChessTreeUtils] Failed to normalize MoveNode array:', e);
      return [];
    }
  }

  // 3. Convert legacy flat string lists (PGN slices) to the modern tree structure
  const rootNodes: MoveNode[] = [];
  const chess = new Chess(initialFen);

  try {
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
            comments: [],
          });
        }
      } catch (e) {
        console.warn(`[ChessTreeUtils] Failed to parse move "${san}" at index ${index}:`, e);
      }
    });
  } catch (e) {
    console.error('[ChessTreeUtils] Error processing moves:', e);
    return [];
  }

  return rootNodes;
}
