const { Chess } = require('chess.js');

// Mock/Copy of getPlyFromFen from chess-tree.utils.ts
function getPlyFromFen(fen) {
  if (!fen) return 0;
  const parts = fen.split(' ');
  if (parts.length < 6) return 0;
  const fullmove = parseInt(parts[5], 10) || 1;
  const turn = parts[1];
  return (fullmove - 1) * 2 + (turn === 'w' ? 0 : 1);
}

// Mock/Copy of normalizeMoveNode
function normalizeMoveNode(node) {
  const san = String(node.san || '');
  const uci = String(node.uci || '');
  const fen = String(node.fen || '');
  const ply = parseInt(String(node.ply || 0), 10);

  let variations = [];
  if (Array.isArray(node.variations)) {
    variations = node.variations
      .map((variation) => {
        if (!Array.isArray(variation)) return [];
        return variation
          .map((v) => normalizeMoveNode(v))
          .filter((v) => v !== null);
      })
      .filter((v) => v.length > 0);
  }

  return {
    san,
    uci,
    fen,
    ply,
    variations,
    comments: Array.isArray(node.comments) ? node.comments.map(String) : [],
    preComments: Array.isArray(node.preComments) ? node.preComments.map(String) : [],
    glyphs: Array.isArray(node.glyphs) ? node.glyphs.map(Number) : [],
    shapes: Array.isArray(node.shapes) ? node.shapes : undefined,
    eval: node.eval,
    forceVariation: node.forceVariation,
    clk: node.clk ? String(node.clk) : undefined,
  };
}

// Mock/Copy of preprocessPgn
function preprocessPgn(pgn) {
  if (!pgn) return '';
  let cleaned = pgn.replace(/\r\n/g, '\n').trim();
  cleaned = cleaned.replace(/\}\s*\{/g, ' ');
  cleaned = cleaned.replace(/(\d+\.{1,3})([^\s])/g, '$1 $2');
  if (cleaned.includes(']')) {
    const lastTagIndex = cleaned.lastIndexOf(']');
    const afterTags = cleaned.substring(lastTagIndex + 1);
    if (afterTags.trim() && !afterTags.startsWith('\n\n')) {
      cleaned = cleaned.substring(0, lastTagIndex + 1) + '\n\n' + afterTags.trim();
    }
  }
  return cleaned;
}

// Mock/Copy of tokenizePgn
function tokenizePgn(pgn) {
  const tokens = [];
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

function parseShapesFromComment(comment) {
  const shapes = [];
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

function getBrushColor(code) {
  switch (code.toUpperCase()) {
    case 'G': return 'green';
    case 'R': return 'red';
    case 'Y': return 'yellow';
    case 'B': return 'blue';
    default: return 'green';
  }
}

// Updated parsePgnToNodes
function parsePgnToNodes(tokens, initialFen) {
  const nodes = [];
  const chess = new Chess(initialFen);
  let lastNode = null;
  let preComment = null;
  let preClk = null;

  while (tokens.length > 0) {
    const token = tokens.shift();

    if (token.startsWith('{')) {
      const rawComment = token.slice(1, -1).trim();
      let clk;
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
      const subTokens = [];
      while (tokens.length > 0) {
        const sub = tokens.shift();
        if (sub === '(') depth++;
        if (sub === ')') depth--;
        if (depth === 0) break;
        subTokens.push(sub);
      }
      
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
          lastNode.glyphs.push(nag);
        }
      }
    } else {
      const glyphMatch = token.match(/([!?]+|\+\-|\-\+|\±|\∓|\=|\∞)$/);
      const cleanSan = token.replace(/([!?]+|\+\-|\-\+|\±|\∓|\=|\∞)$/, '');
      
      try {
        const move = chess.move(cleanSan);
        if (move) {
          const node = {
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
            const nagMap = { 
              '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6,
              '=': 10, '∞': 13, '⩲': 14, '⩱': 15, '±': 16, '∓': 17, '+-': 18, '-+': 19
            };
            if (nagMap[sym]) node.glyphs.push(nagMap[sym]);
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

// Simulated backend serializeMoveTree method
function serializeMoveTree(nodes, lastPly = 0, forceNumber = true) {
  let pgn = "";
  for (const node of nodes) {
    const ply = node.ply || (lastPly + 1);
    const isWhite = (ply % 2 !== 0);
    
    // 1. Pre-comments
    if (node.preComments && node.preComments.length > 0) {
      for (const comment of node.preComments) {
        pgn += "{ " + comment.trim() + " } ";
      }
      forceNumber = true;
    }
    
    // 2. Move number
    if (isWhite) {
      const moveNum = Math.ceil(ply / 2);
      pgn += moveNum + ". ";
    } else if (forceNumber) {
      const moveNum = Math.ceil(ply / 2);
      pgn += moveNum + "... ";
    }
    
    // 3. Move SAN
    pgn += (node.san || '') + " ";
    
    // 4. Glyphs / NAGs (optional)
    if (node.glyphs && node.glyphs.length > 0) {
      for (const glyph of node.glyphs) {
        pgn += "$" + glyph + " ";
      }
    }
    
    // 5. Post-comments & clock (replicated PHP controller change)
    const hasComments = node.comments && node.comments.length > 0;
    const hasClk = !!node.clk;
    if (hasComments || hasClk) {
      pgn += "{ ";
      if (hasClk) {
        pgn += "[%clk " + node.clk + "] ";
      }
      if (hasComments) {
        for (const comment of node.comments) {
          pgn += comment.trim() + " ";
        }
      }
      pgn += "} ";
      forceNumber = true;
    } else {
      forceNumber = false;
    }
    
    // 6. Variations
    if (node.variations && node.variations.length > 0) {
      for (const variation of node.variations) {
        if (variation && variation.length > 0) {
          pgn += "( " + serializeMoveTree(variation, ply - 1, true).trim() + " ) ";
          forceNumber = true;
        }
      }
    }
    
    // 7. Children (mainline continuation - not used in our flat list but part of spec)
    if (node.children && node.children.length > 0) {
      pgn += serializeMoveTree(node.children, ply, forceNumber);
    }
  }
  return pgn.trim();
}

// TEST CASES
const testPgn = `{ [%clk 0:02:00] Start comment } 1. e4 { [%clk 0:01:58] } 1... e5 { [%clk 0:01:55] This is a great move! } *`;

console.log('Testing PGN tokenization and parsing...');
const preprocessed = preprocessPgn(testPgn);
const pgnBody = preprocessed.replace(/^\[.*\]\r?\n?/gm, '').trim();
const tokens = tokenizePgn(pgnBody);
const parsedNodes = parsePgnToNodes(tokens, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

// Normalize nodes
const normalizedNodes = parsedNodes.map(n => normalizeMoveNode(n));

console.log('Normalized Nodes:', JSON.stringify(normalizedNodes, null, 2));

// ASSERTIONS
console.log('\n--- Running Assertions ---');

// 1. Check pre-comment and clock on first move
const firstMove = normalizedNodes[0];
if (firstMove.san === 'e4') {
  console.log('PASS: First move parsed as e4');
  if (firstMove.preComments.includes('Start comment')) {
    console.log('PASS: Start comment captured in preComments');
  } else {
    console.error('FAIL: Start comment NOT captured in preComments. Got:', firstMove.preComments);
  }
  
  if (firstMove.clk === '0:01:58') {
    console.log('PASS: e4 post-move clock updated to 0:01:58');
  } else {
    console.error('FAIL: e4 clock is incorrect. Expected 0:01:58, got:', firstMove.clk);
  }
}

// 2. Check first move post-comment and clock
if (firstMove.comments.length === 0) {
  console.log('PASS: e4 has no comments left (only clk was present)');
} else {
  console.error('FAIL: e4 comments should be empty but got:', firstMove.comments);
}

// 3. Check second move
const secondMove = normalizedNodes[1];
if (secondMove.san === 'e5') {
  console.log('PASS: Second move parsed as e5');
  if (secondMove.clk === '0:01:55') {
    console.log('PASS: e5 clock captured as 0:01:55');
  } else {
    console.error('FAIL: e5 clock NOT captured. Got:', secondMove.clk);
  }
  if (secondMove.comments.includes('This is a great move!')) {
    console.log('PASS: e5 user comment successfully stripped of %clk and preserved');
  } else {
    console.error('FAIL: e5 comment incorrect. Got:', secondMove.comments);
  }
}

// 4. Test serialization back to PGN
console.log('\nTesting serialization back to PGN...');
const serializedPgn = serializeMoveTree(normalizedNodes, 0, true);
console.log('Serialized PGN Output:', serializedPgn);

const expectedPgn = '{ Start comment } 1. e4 { [%clk 0:01:58] } 1... e5 { [%clk 0:01:55] This is a great move! }';
if (serializedPgn.replace(/\s+/g, ' ').trim() === expectedPgn) {
  console.log('PASS: PGN Serialization output matches expected output');
} else {
  console.error('FAIL: PGN Serialization output mismatch.\nExpected:', expectedPgn, '\nGot:', serializedPgn);
}
