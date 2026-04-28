import { Chess } from 'chess.js';
import { MoveNode, GlyphId } from '../models/study.model';

/**
 * Calculates absolute ply from a FEN string.
 * Ply starts at 0 for initial position (White to move, Fullmove 1).
 * Ply 1 is White's first move, Ply 2 is Black's first move, etc.
 */
export function getPlyFromFen(fen: string): number {
  if (!fen) return 0;
  const parts = fen.split(' ');
  if (parts.length < 6) return 0;

  const fullmove = parseInt(parts[5], 10) || 1;
  const turn = parts[1];

  // Formula: (fullmove - 1) * 2 + (turn === 'w' ? 0 : 1)
  return (fullmove - 1) * 2 + (turn === 'w' ? 0 : 1);
}

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
    preComments: Array.isArray(node.preComments) ? node.preComments.map(String) : [],
    glyphs: Array.isArray(node.glyphs) ? (node.glyphs.map(Number) as GlyphId[]) : [],
  };
}

/**
 * Updates a specific node in the tree with new properties.
 * Searches by FEN and Ply.
 */
export function updateNodeInTree(
  nodes: MoveNode[],
  fen: string,
  ply: number,
  updates: Partial<MoveNode>,
): MoveNode[] {
  return nodes.map((node) => {
    if (node.fen === fen && node.ply === ply) {
      return { ...node, ...updates };
    }

    if (node.variations && node.variations.length > 0) {
      const updatedVariations = node.variations.map((v) =>
        updateNodeInTree(v, fen, ply, updates),
      );
      return { ...node, variations: updatedVariations };
    }

    return node;
  });
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
      const startPly = getPlyFromFen(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      // Get initial position comment
      const crawler = new Chess(initialFen);
      crawler.loadPgn(pgnString);
      while (crawler.undo()) {}
      const startComment = crawler.getComment();

      history.forEach((m: any, i: number) => {
        crawler.move(m.san);
        const comment = crawler.getComment();
        
        nodes.push({
          san: m.san,
          uci: m.from + m.to,
          fen: crawler.fen(),
          ply: startPly + i + 1,
          variations: [],
          comments: comment ? [comment] : [],
          preComments: (i === 0 && startComment) ? [startComment] : [],
          glyphs: m.nags ? m.nags.map((n: string) => parseInt(n, 10)) : [],
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
  const startPly = getPlyFromFen(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  try {
    processedMoves.forEach((san: string, index: number) => {
      try {
        const m = chess.move(san);
        if (m) {
          rootNodes.push({
            san: m.san,
            uci: m.from + m.to,
            fen: chess.fen(),
            ply: startPly + index + 1,
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
