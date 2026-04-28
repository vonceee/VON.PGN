const { Chess } = require('chess.js');

const pgn = `{ c1 } { c2 } 1. e4 { c3 } { c4 }`;
const chess = new Chess();
chess.loadPgn(pgn);

console.log(`Start comment: "${chess.getComment()}"`);
chess.undo(); // Just in case
console.log(`Start comment after undo: "${chess.getComment()}"`);

chess.move('e4');
console.log(`After e4: "${chess.getComment()}"`);
