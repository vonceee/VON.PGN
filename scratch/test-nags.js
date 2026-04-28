const { Chess } = require('chess.js');

const pgn = `[FEN "4k1n1/8/8/pPpPpPpP/PpPpPpPp/8/8/4K1N1 w - - 0 1"]
[SetUp "1"]

{ sample comment }
1. Nf3 $1 Nf6 $2 2. Ng1 Ng8 { another comment } *`;

const chess = new Chess();
chess.loadPgn(pgn);

const history = chess.history({ verbose: true });
history.forEach((m, i) => {
  console.log(`Move ${i + 1}: ${m.san}`);
  console.log(`  Move properties: ${Object.keys(m).join(', ')}`);
  // Check for common properties
  if (m.comment) console.log(`  Comment: ${m.comment}`);
  if (m.nags) console.log(`  NAGs: ${m.nags}`);
});

// Test crawler
const crawler = new Chess();
crawler.loadPgn(pgn);
while(crawler.undo()) {}
console.log(`\nStart comment: "${crawler.getComment()}"`);

crawler.move('Nf3');
console.log(`After 1. Nf3 comment: "${crawler.getComment()}"`);
console.log(`After 1. Nf3 NAGs: ${crawler.getComments()}`); // Wait, getComments?
// In 1.x, NAGs are handled differently.
// Let's check getComment() output carefully.
