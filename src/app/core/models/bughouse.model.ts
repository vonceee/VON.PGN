export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q';

export interface BughousePockets {
  p: number;
  n: number;
  b: number;
  r: number;
  q: number;
}

export interface BughouseBoardState {
  fen: string;
  orientation: 'white' | 'black';
  timeW: number;
  timeB: number;
  pocketW: Record<PieceType, number>;
  pocketB: Record<PieceType, number>;
  whiteName: string;
  blackName: string;
  turn: 'w' | 'b';
}

export interface MoveLogEntry {
  id: string;
  board: 'A' | 'B';
  moveColor: 'w' | 'b';
  moveNo: number;
  san: string;
  fen: string;
  playerName: string;
  remainingTime: number;
  timestamp: number;
}

export interface BughousePlayerAssignment {
  id?: string;
  name: string;
  color: 'w' | 'b' | string;
  board: 'A' | 'B' | string;
}

export interface BughouseRecordState {
  wins: number;
  draws: number;
  losses: number;
}

export interface BughouseTeamsState {
  teamA: { captain: BughousePlayerAssignment; partner: BughousePlayerAssignment };
  teamB: { captain: BughousePlayerAssignment; partner: BughousePlayerAssignment };
  boards: {
    boardA: { white: string; black: string };
    boardB: { white: string; black: string };
  };
}

export interface BughouseGameOverState {
  winner: string | null;
  gameEndReason: string | null;
  rematchDeclined: boolean;
  rematchCooldown?: boolean;
  cooldownRemainingSecs?: number;
  rematchOffers: string[];
  hasMyTeamOfferedRematch: boolean;
  hasOpponentTeamOfferedRematch: boolean;
  seriesRound?: number;
  nextGameId?: string | null;
  isCaptain?: boolean;
}

export interface LobbyPlayer {
  uid?: string;
  name: string;
  isOnline: boolean;
  stats?: BughouseRecordState;
}

export interface IncomingInvite {
  id: string;
  sender: string;
}

export interface BughouseTvState {
  gameId: string | null;
  isActive: boolean;
  winner?: string | null;
  boardA: {
    fen: string;
    pocketW: Record<PieceType, number>;
    pocketB: Record<PieceType, number>;
    timeW: number;
    timeB: number;
    turn: 'w' | 'b';
    whiteName: string;
    blackName: string;
  };
  boardB: {
    fen: string;
    pocketW: Record<PieceType, number>;
    pocketB: Record<PieceType, number>;
    timeW: number;
    timeB: number;
    turn: 'w' | 'b';
    whiteName: string;
    blackName: string;
  };
}
