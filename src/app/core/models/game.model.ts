export interface GamePlayer {
  id: number;
  name: string;
  rating?: number;
  rating_deviation?: number;
}

export interface GameState {
  id: string;
  white_player: GamePlayer;
  black_player: GamePlayer;
  status: 'pending' | 'active' | 'completed' | 'aborted';
  time_control: string;
  initial_time_ms: number;
  increment_ms: number;
  fen: string;
  turn: 'white' | 'black';
  moves: string[];
  white_time_remaining_ms: number;
  black_time_remaining_ms: number;
  server_timestamp: string | null;
  result: string | null;
  termination: string | null;
  white_rating_change: number | null;
  black_rating_change: number | null;
  my_color: 'white' | 'black';
  legal_moves: string[];
  draw_offered_by: number | null;
  draw_offered_at: string | null;
  opponent_away_countdown?: number | null;
  firstMoveCountdown?: number | null;
  gameStartedAt?: string | null;
  arena_id?: string | null;
}


export interface MovePlayedPayload {
  game_id: string;
  move: string;
  san: string;
  fen: string;
  turn: 'white' | 'black';
  white_time_remaining_ms: number;
  black_time_remaining_ms: number;
  server_timestamp: string;
  status: string;
  result: string | null;
  termination: string | null;
  is_check: boolean;
  is_checkmate: boolean;
  is_stalemate: boolean;
  is_draw: boolean;
  legal_moves: string[];
}

export interface GameEndedPayload {
  game_id: string;
  status: string;
  result: string | null;
  termination: string | null;
  white_time_remaining_ms: number;
  black_time_remaining_ms: number;
  fen?: string;
  rating_change?: {
    white: number;
    black: number;
  };
  white_rating_change?: number | null;
  black_rating_change?: number | null;
}


export interface DrawOfferedPayload {
  gameId: string;
  offeredBy: 'white' | 'black';
  offeredByUserId: number;
}

export interface DrawDeclinedPayload {
  gameId: string;
}


export interface TimeControlOption {
  label: string;
  value: string;
  baseSeconds: number;
  incrementSeconds: number;
  category: 'bullet' | 'blitz' | 'rapid';
}

export interface GameSeek {
  id: number;
  user_id: number;
  username: string;
  elo: number;
  time_control: string;
  created_at: string;
}



export interface RematchOfferedPayload {
  gameId: string;
  offeredBy: string;
}

export interface RematchAcceptedPayload {
  oldGameId: string;
  newGameId: string;
}

export const TIME_CONTROLS: TimeControlOption[] = [
  { label: '1+0', value: '60+0', baseSeconds: 60, incrementSeconds: 0, category: 'bullet' },
  { label: '1+1', value: '60+1', baseSeconds: 60, incrementSeconds: 1, category: 'bullet' },
  { label: '2+1', value: '120+1', baseSeconds: 120, incrementSeconds: 1, category: 'bullet' },
  { label: '3+0', value: '180+0', baseSeconds: 180, incrementSeconds: 0, category: 'blitz' },
  { label: '3+2', value: '180+2', baseSeconds: 180, incrementSeconds: 2, category: 'blitz' },
  { label: '5+0', value: '300+0', baseSeconds: 300, incrementSeconds: 0, category: 'blitz' },
  { label: '10+0', value: '600+0', baseSeconds: 600, incrementSeconds: 0, category: 'rapid' },
  { label: '10+5', value: '600+5', baseSeconds: 600, incrementSeconds: 5, category: 'rapid' },
  { label: '15+0', value: '900+0', baseSeconds: 900, incrementSeconds: 0, category: 'rapid' },
];
