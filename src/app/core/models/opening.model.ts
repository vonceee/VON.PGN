export interface LichessExplorerPlayer {
  name: string;
  rating: number;
}

export interface LichessExplorerGame {
  id: string;
  white: LichessExplorerPlayer;
  black: LichessExplorerPlayer;
  winner?: 'white' | 'black' | 'draw';
  year: number;
  month?: string;
  speed: string;
  mode: string;
  uci?: string;
}

export interface LichessExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating: number;
  performance?: number;
  opening?: {
    eco: string;
    name: string;
  };
}

export interface LichessExplorerResponse {
  white: number;
  draws: number;
  black: number;
  moves: LichessExplorerMove[];
  topGames: LichessExplorerGame[];
  recentGames?: LichessExplorerGame[];
  opening?: {
    eco: string;
    name: string;
  };
  isOpening?: boolean;
}

export type TablebaseCategory =
  | 'loss'
  | 'unknown'
  | 'syzygy-loss'
  | 'maybe-loss'
  | 'blessed-loss'
  | 'draw'
  | 'cursed-win'
  | 'maybe-win'
  | 'syzygy-win'
  | 'win';

export interface TablebaseMove {
  uci: string;
  san: string;
  dtz?: number;
  dtm?: number;
  dtw?: number;
  dtc?: number;
  checkmate?: boolean;
  stalemate?: boolean;
  variant_win?: boolean;
  variant_loss?: boolean;
  insufficient_material?: boolean;
  zeroing?: boolean;
  category: TablebaseCategory;
}

export interface TablebaseResponse {
  moves: TablebaseMove[];
  dtz?: number;
  dtm?: number;
  dtw?: number;
  dtc?: number;
  checkmate?: boolean;
  stalemate?: boolean;
  variant_win?: boolean;
  variant_loss?: boolean;
  insufficient_material?: boolean;
  category: TablebaseCategory;
  isTablebase?: boolean;
}

export type ExplorerData = LichessExplorerResponse | TablebaseResponse;