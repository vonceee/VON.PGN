const { Chess } = require('chess.js');

const pgn = `{ start } 1. e4 $1 { after e4 }`;
const chess = new Chess();
chess.loadPgn(pgn);

console.log('JSON.stringify(chess.getComments()):');
console.log(JSON.stringify(chess.getComments(), null, 2));
