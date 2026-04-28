// Mocking the environment to test buildTreeFromMoves
const { Chess } = require('chess.js');

// Copy of getPlyFromFen from chess-tree.utils.ts
function getPlyFromFen(fen) {
  if (!fen) return 0;
  const parts = fen.split(' ');
  if (parts.length < 6) return 0;
  const fullmove = parseInt(parts[5], 10) || 1;
  const turn = parts[1];
  return (fullmove - 1) * 2 + (turn === 'w' ? 0 : 1);
}

// Copy of buildTreeFromMoves (simplified to the PGN path)
function buildTreeFromMoves(moves, initialFen) {
  const pgnString = moves.pgn;
  const chess = new Chess(initialFen);
  chess.loadPgn(pgnString);
  const history = chess.history({ verbose: true });
  const nodes = [];
  const startPly = getPlyFromFen(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  // Get initial position comment
  const crawler = new Chess(initialFen);
  crawler.loadPgn(pgnString);
  while (crawler.undo()) {}
  const startComment = crawler.getComment();

  history.forEach((m, i) => {
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
      glyphs: m.nags ? m.nags.map((n) => parseInt(n, 10)) : [],
    });
  });
  return nodes;
}

const pgn = `{ sample comment }
1. Nf3 Nf6 2. Ng1 Ng8 { another comment } *`;

const result = buildTreeFromMoves({ pgn }, undefined);

console.log('Parsed Nodes:');
result.forEach((node, i) => {
  console.log(`${node.ply}. ${node.san}`);
  if (node.preComments && node.preComments.length) console.log(`  Pre-comments: ${JSON.stringify(node.preComments)}`);
  if (node.comments && node.comments.length) console.log(`  Comments: ${JSON.stringify(node.comments)}`);
});

// Verification assertions
if (result[0].preComments[0].trim() === 'sample comment') {
  console.log('\nSUCCESS: Start comment captured correctly!');
} else {
  console.error('\nFAILURE: Start comment missing or incorrect:', result[0].preComments);
}

if (result[3].comments[0].trim() === 'another comment') {
  console.log('SUCCESS: End comment captured correctly!');
} else {
  console.error('FAILURE: End comment missing or incorrect:', result[3].comments);
}
