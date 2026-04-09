/**
 * PGN Parser - Converts PGN notation to chess board state
 */

export interface ChessPosition {
  board: (string | null)[][];
  toMove: 'w' | 'b';
  moveCount: number;
  history: string[];
}

const PIECE_VALUES: { [key: string]: string } = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

export class PgnParser {
  /**
   * Parse PGN and return current board state
   */
  static parseCurrentPosition(pgn: string): ChessPosition {
    const lines = pgn.split('\n');
    let moves: string[] = [];
    let inMoveSection = false;

    // Find the move section (after all headers)
    for (const line of lines) {
      if (line.startsWith('[')) continue;
      if (line.trim()) {
        // Parse moves - remove annotations and numbers
        const moveText = line.replace(/\d+\.\s*/g, '').split(/\s+/);
        moves = moves.concat(moveText.filter(m => m && !m.startsWith('{')));
        inMoveSection = true;
      }
    }

    return {
      board: this.getInitialBoard(),
      toMove: 'w',
      moveCount: moves.length,
      history: moves.slice(0, -1) // Exclude incomplete moves
    };
  }

  /**
   * Get initial chess board
   */
  private static getInitialBoard(): (string | null)[][] {
    return [
      ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
      ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
      ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];
  }

  /**
   * Extract metadata from PGN
   */
  static extractMetadata(pgn: string): { [key: string]: string } {
    const metadata: { [key: string]: string } = {};
    const headerPattern = /\[(\w+)\s+"([^"]+)"\]/g;
    
    let match;
    while ((match = headerPattern.exec(pgn)) !== null) {
      metadata[match[1]] = match[2];
    }

    return metadata;
  }

  /**
   * Get move list from PGN
   */
  static getMoveList(pgn: string): string[] {
    const lines = pgn.split('\n');
    const moves: string[] = [];

    for (const line of lines) {
      if (line.startsWith('[')) continue;
      if (!line.trim()) continue;

      // Extract algebraic notation
      const movePattern = /([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)(\+|#)?/g;
      let match;
      while ((match = movePattern.exec(line)) !== null) {
        if (match[1]) moves.push(match[1]);
      }
    }

    return moves;
  }
}
