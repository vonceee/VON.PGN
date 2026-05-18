export interface PuzzleThemeDef {
  key: string;
  name: string;
  description: string;
}

export interface PuzzleThemeCategory {
  name: string;
  description?: string;
  themes: PuzzleThemeDef[];
}

export const PUZZLE_THEMES_HIERARCHY: PuzzleThemeCategory[] = [
  {
    name: 'Recommended',
    themes: [
      {
        key: 'mix',
        name: 'Recommended',
        description: 'A mix of all tactical themes adjusted to your tactics rating.',
      },
    ],
  },
  {
    name: 'Phases',
    themes: [
      {
        key: 'opening',
        name: 'Opening',
        description: 'Tactical opportunities during the first phase of the game.',
      },
      {
        key: 'middlegame',
        name: 'Middlegame',
        description: 'Tactical battles in the strategic phase of the chess game.',
      },
      {
        key: 'endgame',
        name: 'Endgame',
        description: 'Tactical opportunities during the final phase of the game.',
      },
      {
        key: 'rookEndgame',
        name: 'Rook endgame',
        description: 'Tactical battles in endgames featuring only rooks and pawns.',
      },
      {
        key: 'bishopEndgame',
        name: 'Bishop endgame',
        description: 'Tactical battles in endgames featuring only bishops and pawns.',
      },
      {
        key: 'pawnEndgame',
        name: 'Pawn endgame',
        description: 'Tactical endgames involving only kings and pawns.',
      },
      {
        key: 'knightEndgame',
        name: 'Knight endgame',
        description: 'Tactical battles in endgames featuring only knights and pawns.',
      },
      {
        key: 'queenEndgame',
        name: 'Queen endgame',
        description: 'Tactical battles in endgames featuring only queens and pawns.',
      },
      {
        key: 'queenRookEndgame',
        name: 'Queen and rook',
        description: 'Endgame tactics featuring queens, rooks, and pawns.',
      },
    ],
  },
  {
    name: 'Motifs',
    themes: [
      {
        key: 'advancedPawn',
        name: 'Advanced pawn',
        description: 'A pawn pushed deep into enemy territory, threatening promotion.',
      },
      {
        key: 'attackingF2F7',
        name: 'Attacking f2/f7',
        description: 'Targeting the weakest squares around the enemy king at the start.',
      },
      {
        key: 'capturingDefender',
        name: 'Remove the defender',
        description: 'Eliminating a piece that is guarding an otherwise vulnerable target.',
      },
      {
        key: 'discoveredAttack',
        name: 'Discovered attack',
        description: 'Moving a piece to reveal an attack from a long-range teammate behind it.',
      },
      {
        key: 'doubleCheck',
        name: 'Double check',
        description: 'Checking the king with two pieces simultaneously, forcing the king to move.',
      },
      {
        key: 'exposedKing',
        name: 'Exposed king',
        description: 'Exploiting an opponent king lacking protective pawn shelter.',
      },
      {
        key: 'fork',
        name: 'Fork',
        description: 'A single piece attacking two or more opponent pieces at the same time.',
      },
      {
        key: 'hangingPiece',
        name: 'Hanging piece',
        description: 'A piece that is completely undefended and can be captured for free.',
      },
      {
        key: 'kingsideAttack',
        name: 'Kingside attack',
        description: 'An offensive operation targeted at the castled or uncastled kingside.',
      },
      {
        key: 'pin',
        name: 'Pin',
        description: 'Restricting an opponent\'s piece because moving it would expose a more valuable piece.',
      },
      {
        key: 'queensideAttack',
        name: 'Queenside attack',
        description: 'An offensive operation targeted at the queenside.',
      },
      {
        key: 'sacrifice',
        name: 'Sacrifice',
        description: 'Giving up material to gain a tactical or strategic advantage.',
      },
      {
        key: 'skewer',
        name: 'Skewer',
        description: 'An attack on a valuable piece, forcing it to move and expose a piece behind it.',
      },
      {
        key: 'trappedPiece',
        name: 'Trapped piece',
        description: 'Surrounding and capturing a piece that has no safe escape squares.',
      },
    ],
  },
  {
    name: 'Advanced',
    themes: [
      {
        key: 'attraction',
        name: 'Attraction',
        description: 'Luring an opponent\'s piece to a square where it becomes vulnerable.',
      },
      {
        key: 'clearance',
        name: 'Clearance',
        description: 'Vacating a square or diagonal to open lines for another attack.',
      },
      {
        key: 'collinearMove',
        name: 'Collinear move',
        description: 'Moving a piece along the line of attack of another piece.',
      },
      {
        key: 'defensiveMove',
        name: 'Defensive move',
        description: 'Finding the precise defensive resource to save or stabilize the position.',
      },
      {
        key: 'deflection',
        name: 'Deflection',
        description: 'Distracting an opponent\'s piece away from its defensive duties.',
      },
      {
        key: 'discoveredCheck',
        name: 'Discovered check',
        description: 'Revealing a check on the opponent king by moving an intervening piece.',
      },
      {
        key: 'interference',
        name: 'Interference',
        description: 'Blocking the line of communication between defending pieces.',
      },
      {
        key: 'intermezzo',
        name: 'Intermediate move',
        description: 'An unexpected in-between move inserted before completing a planned sequence.',
      },
      {
        key: 'quietMove',
        name: 'Quiet move',
        description: 'A non-checking, non-capturing move that sets up a decisive threat.',
      },
      {
        key: 'xRayAttack',
        name: 'X-ray attack',
        description: 'An attack through an intervening piece along an open file or diagonal.',
      },
      {
        key: 'zugzwang',
        name: 'Zugzwang',
        description: 'A position where any move the player makes will worsen their situation.',
      },
    ],
  },
  {
    name: 'Mates',
    themes: [
      {
        key: 'mate',
        name: 'Checkmate',
        description: 'End the game by trapping the opponent\'s king.',
      },
      {
        key: 'mateIn1',
        name: 'Mate in 1',
        description: 'Deliver checkmate in exactly one move.',
      },
      {
        key: 'mateIn2',
        name: 'Mate in 2',
        description: 'Deliver checkmate in exactly two moves.',
      },
      {
        key: 'mateIn3',
        name: 'Mate in 3',
        description: 'Deliver checkmate in exactly three moves.',
      },
      {
        key: 'mateIn4',
        name: 'Mate in 4',
        description: 'Deliver checkmate in exactly four moves.',
      },
      {
        key: 'mateIn5',
        name: 'Mate in 5',
        description: 'Deliver checkmate in five or more moves.',
      },
    ],
  },
  {
    name: 'Mating Themes',
    themes: [
      {
        key: 'anastasiaMate',
        name: 'Anastasia\'s mate',
        description: 'A rook and knight trapping the king against the side of the board.',
      },
      {
        key: 'arabianMate',
        name: 'Arabian mate',
        description: 'A knight and rook delivering checkmate on a corner square.',
      },
      {
        key: 'backRankMate',
        name: 'Back-rank mate',
        description: 'Checkmate delivered on the 1st or 8th rank behind a wall of pawns.',
      },
      {
        key: 'balestraMate',
        name: 'Balestra mate',
        description: 'A queen and bishop trapping the king against the board edge.',
      },
      {
        key: 'blindSwineMate',
        name: 'Blind swine mate',
        description: 'Checkmate delivered by two rooks on the seventh rank.',
      },
      {
        key: 'bodenMate',
        name: 'Boden\'s mate',
        description: 'Two crisscrossing bishops delivering checkmate to an exposed king.',
      },
      {
        key: 'cornerMate',
        name: 'Corner mate',
        description: 'Checkmate using a piece that blocks the king\'s flight squares in a corner.',
      },
      {
        key: 'doubleBishopMate',
        name: 'Double bishop mate',
        description: 'Two active bishops collaborating to deliver checkmate.',
      },
      {
        key: 'dovetailMate',
        name: 'Dovetail mate',
        description: 'A queen checkmating a king whose adjacent escape squares are blocked.',
      },
      {
        key: 'epauletteMate',
        name: 'Epaulette mate',
        description: 'A checkmate where the king\'s own pieces block its escape on both sides.',
      },
      {
        key: 'hookMate',
        name: 'Hook mate',
        description: 'A rook, knight, and protecting pawn trapping the king.',
      },
      {
        key: 'killBoxMate',
        name: 'Kill box mate',
        description: 'A rook assisted by a queen box trapping the king.',
      },
      {
        key: 'morphysMate',
        name: 'Morphy\'s mate',
        description: 'A rook and bishop trapping the king using open files and diagonals.',
      },
      {
        key: 'operaMate',
        name: 'Opera mate',
        description: 'A rook on the back rank backed by a bishop on a long diagonal.',
      },
      {
        key: 'pillsburysMate',
        name: 'Pillsbury\'s mate',
        description: 'A rook delivering checkmate while a bishop cuts off the king\'s escape.',
      },
      {
        key: 'smotheredMate',
        name: 'Smothered mate',
        description: 'A knight checkmating a king completely surrounded by its own pieces.',
      },
      {
        key: 'swallowstailMate',
        name: 'Swallows-tail mate',
        description: 'A queen checkmating a king blocked behind by its own rooks or pieces.',
      },
      {
        key: 'triangleMate',
        name: 'Triangle mate',
        description: 'A queen delivering mate with a rook or bishop sealing the triangle flight squares.',
      },
      {
        key: 'vukovicMate',
        name: 'Vuković\'s mate',
        description: 'A rook and knight checkmating the king on the board edge.',
      },
    ],
  },
  {
    name: 'Special Moves',
    themes: [
      {
        key: 'castling',
        name: 'Castling',
        description: 'Tactics involving king safety and rook development via castling.',
      },
      {
        key: 'enPassant',
        name: 'En passant',
        description: 'Tactics utilizing the special en passant pawn capture.',
      },
      {
        key: 'promotion',
        name: 'Promotion',
        description: 'Promoting a pawn to a queen or another piece to win the game.',
      },
      {
        key: 'underPromotion',
        name: 'Underpromotion',
        description: 'Promoting a pawn to a knight, bishop, or rook instead of a queen.',
      },
    ],
  },
  {
    name: 'Goals',
    themes: [
      {
        key: 'equality',
        name: 'Equality',
        description: 'Tactics that save a losing game and secure a draw or level position.',
      },
      {
        key: 'advantage',
        name: 'Advantage',
        description: 'Securing a clear, decisive positional or material advantage.',
      },
      {
        key: 'crushing',
        name: 'Crushing',
        description: 'Tactics that completely demolish the opponent\'s position and force resignation.',
      },
    ],
  },
  {
    name: 'Lengths',
    themes: [
      {
        key: 'oneMove',
        name: 'One move',
        description: 'Quick tactical puzzles resolved in exactly one move.',
      },
      {
        key: 'short',
        name: 'Short',
        description: 'Simple tactical puzzles resolved in two moves.',
      },
      {
        key: 'long',
        name: 'Long',
        description: 'Complex tactical puzzles requiring three to four moves.',
      },
      {
        key: 'veryLong',
        name: 'Very long',
        description: 'Deep tactical calculations requiring five or more moves.',
      },
    ],
  },
  {
    name: 'Origin',
    themes: [
      {
        key: 'master',
        name: 'Master games',
        description: 'Puzzles sourced from official FIDE master games.',
      },
      {
        key: 'masterVsMaster',
        name: 'Master vs Master',
        description: 'Puzzles sourced from battles between two verified master players.',
      },
      {
        key: 'superGM',
        name: 'Super GM games',
        description: 'Puzzles sourced from elite tournaments featuring the world\'s top players.',
      },
    ],
  },
];
