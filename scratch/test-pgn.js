const { Chess } = require('chess.js');

const pgn = `[Event "vontheworst's Study: Chapter 13"]
[Date "2026.04.26"]
[Result "*"]
[Variant "Standard"]
[ECO "?"]
[Opening "?"]
[StudyName "vontheworst's Study"]
[ChapterName "Chapter 13"]
[ChapterURL "https://lichess.org/study/3S5Tbwh4/PjGu8oc5"]
[Annotator "https://lichess.org/@/vontheworst"]
[FEN "4k1n1/8/8/pPpPpPpP/PpPpPpPp/8/8/4K1N1 w - - 0 1"]
[SetUp "1"]
[UTCDate "2026.04.26"]
[UTCTime "06:35:47"]

{ sample comment }
1. Nf3 Nf6 2. Ng1 Ng8 { another comment } *`;

const chess = new Chess();
chess.loadPgn(pgn);

console.log('History (verbose):');
const history = chess.history({ verbose: true });
history.forEach((m, i) => {
  console.log(`Move ${i + 1}: ${m.san}, Comment: ${m.comment}`);
});

console.log('\nComments at positions:');
const temp = new Chess();
temp.loadPgn(pgn.split('\n\n')[0]); // Load headers only first? No, load whole thing.
temp.loadPgn(pgn);

// Go back to start
while (temp.undo()) {}
console.log(`Start position comment: "${temp.getComment()}"`);

temp.move('Nf3');
console.log(`After 1. Nf3 comment: "${temp.getComment()}"`);

temp.move('Nf6');
console.log(`After 1... Nf6 comment: "${temp.getComment()}"`);

temp.move('Ng1');
console.log(`After 2. Ng1 comment: "${temp.getComment()}"`);

temp.move('Ng8');
console.log(`After 2... Ng8 comment: "${temp.getComment()}"`);
