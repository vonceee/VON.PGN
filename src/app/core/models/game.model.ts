export interface GamePlayer {
  id: number;
  name: string;
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
  server_timestamp: string;
  result: string | null;
  termination: string | null;
  my_color: 'white' | 'black';
  legal_moves: string[];
  draw_offered_by: number | null;
  draw_offered_at: string | null;
  buffer_seconds_remaining?: number;
}

export interface GameMatchedPayload {
  game_id: string;
  white_player: GamePlayer;
  black_player: GamePlayer;
  time_control: string;
  initial_time_ms: number;
  increment_ms: number;
  status: string;
  initial_fen: string;
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
  buffer_seconds_remaining?: number;
}

export interface GameEndedPayload {
  game_id: string;
  status: string;
  result: string;
  termination: string;
  white_time_remaining_ms: number;
  black_time_remaining_ms: number;
  fen?: string;
}

export interface ClockSyncPayload {
  game_id: string;
  white_time_remaining_ms: number;
  black_time_remaining_ms: number;
  server_timestamp: string;
  buffer_seconds_remaining?: number;
}

export interface DrawOfferedPayload {
  game_id: string;
  offered_by: 'white' | 'black';
  offered_by_user_id: number;
  cooldown_expires_at: string | null;
}

export interface TimeControlOption {
  label: string;
  value: string;
  baseSeconds: number;
  incrementSeconds: number;
  category: 'bullet' | 'blitz' | 'rapid';
}

export const TIME_CONTROLS: TimeControlOption[] = [
  { label: '1+0', value: '60+0', baseSeconds: 60, incrementSeconds: 0, category: 'bullet' },
  { label: '2+0', value: '120+0', baseSeconds: 120, incrementSeconds: 0, category: 'bullet' },
  { label: '2+1', value: '120+1', baseSeconds: 120, incrementSeconds: 1, category: 'bullet' },
  { label: '3+0', value: '180+0', baseSeconds: 180, incrementSeconds: 0, category: 'blitz' },
  { label: '3+2', value: '180+2', baseSeconds: 180, incrementSeconds: 2, category: 'blitz' },
  { label: '5+0', value: '300+0', baseSeconds: 300, incrementSeconds: 0, category: 'blitz' },
  { label: '10+0', value: '600+0', baseSeconds: 600, incrementSeconds: 0, category: 'rapid' },
  { label: '10+5', value: '600+5', baseSeconds: 600, incrementSeconds: 5, category: 'rapid' },
  { label: '15+0', value: '900+0', baseSeconds: 900, incrementSeconds: 0, category: 'rapid' },
];
