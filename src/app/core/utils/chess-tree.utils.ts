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
    shapes: Array.isArray(node.shapes) ? node.shapes : undefined,
    eval: node.eval,
    forceVariation: node.forceVariation,
    clk: node.clk ? String(node.clk) : undefined,
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
 * Sanitizes a PGN string to make it more compatible with the chess.js parser.
 * - Merges adjacent comment blocks (e.g. "} {" -> " ").
 * - Normalizes whitespace and newlines.
 * - Ensures a blank line between tags and moves.
 */
function preprocessPgn(pgn: string): string {
  if (!pgn) return '';

  // 1. Normalize line endings and trim
  let cleaned = pgn.replace(/\r\n/g, '\n').trim();

  // 2. Fix adjacent comment blocks: "} {" -> " "
  // Also handles cases with whitespace between them: "}   {"
  cleaned = cleaned.replace(/\}\s*\{/g, ' ');

  // 3. Fix missing spaces after move numbers: "1.d4" -> "1. d4", "1...Nf6" -> "1... Nf6"
  // This helps the tokenizer separate move numbers from actual SAN moves.
  cleaned = cleaned.replace(/(\d+\.{1,3})([^\s\.])/g, '$1 $2');

  // 4. Ensure a blank line between the last tag and the first move/comment
  // PGN tags end with ] and the body starts with either { or a move like 1.
  if (cleaned.includes(']')) {
    const lastTagIndex = cleaned.lastIndexOf(']');
    const afterTags = cleaned.substring(lastTagIndex + 1);
    // If there's no blank line between tags and moves, add one
    if (afterTags.trim() && !afterTags.startsWith('\n\n')) {
      cleaned = cleaned.substring(0, lastTagIndex + 1) + '\n\n' + afterTags.trim();
    }
  }

  return cleaned;
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
    const pgnString = preprocessPgn(processedMoves.pgn as string);
    try {
      const pgnBody = pgnString.replace(/^\[.*\]\r?\n?/gm, '').trim();
      const tokens = tokenizePgn(pgnBody);
      return parsePgnToNodes(tokens, initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
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
/**
 * Tokenizes a PGN string into moves, comments, brackets, and NAGs.
 */
function tokenizePgn(pgn: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < pgn.length) {
    const char = pgn[i];
    if (char === '{') {
      let end = pgn.indexOf('}', i);
      if (end === -1) end = pgn.length;
      tokens.push(pgn.substring(i, end + 1));
      i = end + 1;
    } else if (char === '(' || char === ')') {
      tokens.push(char);
      i++;
    } else if (/\s/.test(char)) {
      i++;
    } else {
      let end = i;
      while (end < pgn.length && !/\s|\(|\)|\{|\}/.test(pgn[end])) {
        end++;
      }
      tokens.push(pgn.substring(i, end));
      i = end;
    }
  }
  return tokens;
}

/**
 * Recursively parses PGN tokens into a MoveNode tree.
 */
function parsePgnToNodes(tokens: string[], initialFen: string): MoveNode[] {
  const nodes: MoveNode[] = [];
  const chess = new Chess(initialFen);
  let lastNode: MoveNode | null = null;
  let preComment: string | null = null;
  let preClk: string | null = null;

  while (tokens.length > 0) {
    const token = tokens.shift()!;

    if (token.startsWith('{')) {
      const rawComment = token.slice(1, -1).trim();
      let clk: string | undefined;
      const clkMatch = rawComment.match(/\[%clk\s+([^\]]+)\]/i);
      if (clkMatch) {
        clk = clkMatch[1].trim();
      }

      const comment = rawComment
        .replace(/\[%clk\s+[^\]]+\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (lastNode) {
        if (clk) {
          lastNode.clk = clk;
        }
        if (comment) {
          if (!lastNode.comments) lastNode.comments = [];
          lastNode.comments.push(comment);
        }
        const shapes = parseShapesFromComment(rawComment);
        if (shapes.length > 0) {
          lastNode.shapes = [...(lastNode.shapes || []), ...shapes];
        }
      } else {
        if (clk) {
          preClk = clk;
        }
        if (comment) {
          preComment = comment;
        }
      }
    } else if (token === '(') {
      let depth = 1;
      const subTokens: string[] = [];
      while (tokens.length > 0) {
        const sub = tokens.shift()!;
        if (sub === '(') depth++;
        if (sub === ')') depth--;
        if (depth === 0) break;
        subTokens.push(sub);
      }
      
      // Variation branches from the position BEFORE the current lastNode
      const parentFen = nodes.length > 1 ? nodes[nodes.length - 2].fen : initialFen;
      const variation = parsePgnToNodes(subTokens, parentFen);
      if (variation.length > 0 && lastNode) {
        if (!lastNode.variations) lastNode.variations = [];
        lastNode.variations.push(variation);
      }
    } else if (token === ')' || /^[0-9]+\.*$/.test(token) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
      continue;
    } else if (token.startsWith('$')) {
      if (lastNode) {
        const nag = parseInt(token.slice(1), 10);
        if (!isNaN(nag)) {
          if (!lastNode.glyphs) lastNode.glyphs = [];
          lastNode.glyphs.push(nag as GlyphId);
        }
      }
    } else {
      // Handle positional symbols that might be independent tokens (e.g., 1. e4 e5 +- )
      const symbolNagMap: Record<string, number> = {
        '=': 10, '∞': 13, '⩲': 14, '⩱': 15, '±': 16, '∓': 17, '+-': 18, '-+': 19,
        '□': 7, '⊙': 22, 'N': 146
      };

      if (symbolNagMap[token]) {
        if (lastNode) {
          if (!lastNode.glyphs) lastNode.glyphs = [];
          if (!lastNode.glyphs.includes(symbolNagMap[token])) {
            lastNode.glyphs.push(symbolNagMap[token] as GlyphId);
          }
        }
        continue;
      }

      // Strip glyphs from SAN if present (e.g. Nf6!, e4??, d4+-)
      const glyphMatch = token.match(/([!?]+|\+\-|\-\+|\±|\∓|\=|\∞)$/);
      const cleanSan = token.replace(/([!?]+|\+\-|\-\+|\±|\∓|\=|\∞)$/, '');
      
      try {
        const move = chess.move(cleanSan);
        if (move) {
          const node: MoveNode = {
            san: move.san,
            uci: move.from + move.to,
            fen: chess.fen(),
            ply: getPlyFromFen(chess.fen()),
            variations: [],
            comments: [],
            preComments: preComment ? [preComment] : [],
            glyphs: []
          };
          if (preClk) {
            node.clk = preClk;
            preClk = null;
          }

          if (glyphMatch) {
            const sym = glyphMatch[0];
            const nagMap: Record<string, number> = { 
              '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6,
              '=': 10, '∞': 13, '⩲': 14, '⩱': 15, '±': 16, '∓': 17, '+-': 18, '-+': 19
            };
            if (nagMap[sym]) node.glyphs!.push(nagMap[sym] as GlyphId);
          }

          nodes.push(node);
          lastNode = node;
          preComment = null;
        }
      } catch (e) {
        // Not a valid move, ignore
      }
    }
  }
  return nodes;
}

/**
 * Determine current navigation context (current node, next moves, and parent)
 * within a MoveNode tree for a specific FEN.
 */
export function findNodeContext(
  nodes: MoveNode[],
  fen: string,
  parent: MoveNode | null = null,
): { current: MoveNode | null; next: MoveNode[]; parent: MoveNode | null } {
  if (!fen || !nodes) return { current: null, next: [], parent: null };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.fen === fen) {
      let next: MoveNode[] = [];
      if (i + 1 < nodes.length) {
        const nextNode = nodes[i + 1];
        next = [nextNode, ...(nextNode.variations?.map((v) => v[0]) || [])];
      }
      return { current: node, next, parent: i > 0 ? nodes[i - 1] : parent };
    }

    if (node.variations) {
      for (const variation of node.variations) {
        const res = findNodeContext(variation, fen, node);
        if (res.current) return res;
      }
    }
  }
  return { current: null, next: [], parent: null };
}

export function findNodeRecursive(nodes: MoveNode[], fen: string): MoveNode | null {
  for (const node of nodes) {
    if (node.fen === fen) return node;
    if (node.variations) {
      for (const variation of node.variations) {
        const found = findNodeRecursive(variation, fen);
        if (found) return found;
      }
    }
  }
  return null;
}

export function insertNodeDeep(nodes: MoveNode[], parentPly: number, parentFen: string, newNode: MoveNode): MoveNode[] {
  const result: MoveNode[] = nodes.map(node => ({ ...node, variations: node.variations ? node.variations.map(v => [...v]) : [] }));
  for (let i = 0; i < result.length; i++) {
    const node = result[i];
    if (node.ply === parentPly && node.fen === parentFen) {
      if (i === result.length - 1) result.push(newNode);
      else {
        const nextNode = result[i + 1];
        if (nextNode.san !== newNode.san) {
          if (!nextNode.variations) nextNode.variations = [];
          if (!nextNode.variations.find(v => v.length > 0 && v[0].san === newNode.san)) nextNode.variations.push([newNode]);
        }
      }
      return result;
    }
    if (node.variations) {
      for (let j = 0; j < node.variations.length; j++) {
        const updated = insertNodeDeep(node.variations[j], parentPly, parentFen, newNode);
        if (updated.length > 0) { node.variations[j] = updated; return result; }
      }
    }
  }
  return [];
}

export function deleteFromHereRecursive(nodes: MoveNode[], target: MoveNode): MoveNode[] {
  const index = nodes.findIndex(n => n.fen === target.fen && n.ply === target.ply);
  if (index !== -1) return nodes.slice(0, index);
  return nodes.map(node => {
    if (!node.variations?.length) return node;
    const updatedVariations = node.variations.map(v => deleteFromHereRecursive(v, target)).filter(v => v.length > 0);
    return (updatedVariations.length !== node.variations.length || updatedVariations.some((v, i) => v !== node.variations![i])) ? { ...node, variations: updatedVariations } : node;
  });
}

export function findVariationBranch(
  nodes: MoveNode[],
  targetFen: string,
  targetPly: number
): { parentList: MoveNode[]; variationIndex: number; branchIndex: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.variations) {
      for (let j = 0; j < node.variations.length; j++) {
        const variation = node.variations[j];
        const foundIdx = variation.findIndex(n => n.fen === targetFen && n.ply === targetPly);
        if (foundIdx !== -1) {
          return { parentList: nodes, variationIndex: i, branchIndex: j };
        }
        const res = findVariationBranch(variation, targetFen, targetPly);
        if (res) return res;
      }
    }
  }
  return null;
}

function parseShapesFromComment(comment: string): any[] {
  const shapes: any[] = [];
  const cslMatch = comment.match(/\[%csl\s+([^\]]+)\]/);
  if (cslMatch) {
    const items = cslMatch[1].split(',');
    for (let item of items) {
      item = item.trim();
      if (item.length >= 3) {
        const colorCode = item.charAt(0);
        const square = item.substring(1, 3);
        shapes.push({ orig: square, brush: getBrushColor(colorCode) });
      }
    }
  }
  const calMatch = comment.match(/\[%cal\s+([^\]]+)\]/);
  if (calMatch) {
    const items = calMatch[1].split(',');
    for (let item of items) {
      item = item.trim();
      if (item.length >= 5) {
        const colorCode = item.charAt(0);
        const orig = item.substring(1, 3);
        const dest = item.substring(3, 5);
        shapes.push({ orig, dest, brush: getBrushColor(colorCode) });
      }
    }
  }
  return shapes;
}

function getBrushColor(code: string): string {
  switch (code.toUpperCase()) {
    case 'G': return 'green';
    case 'R': return 'red';
    case 'Y': return 'yellow';
    case 'B': return 'blue';
    default: return 'green';
  }
}

export function findPathToFen(
  nodes: MoveNode[],
  targetFen: string,
  currentPath: MoveNode[] = []
): MoveNode[] | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = [...currentPath, node];
    if (node.fen === targetFen) {
      return path;
    }
    
    if (node.variations) {
      for (const variation of node.variations) {
        const varPath = findPathToFen(variation, targetFen, currentPath);
        if (varPath) return varPath;
      }
    }
    
    currentPath = [...currentPath, node];
  }
  return null;
}
