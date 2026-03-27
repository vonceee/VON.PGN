export interface LichessExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating: number;
}

export interface LichessExplorerResponse {
  white: number;
  draws: number;
  black: number;
  moves: LichessExplorerMove[];
  topGames: any[];
  opening?: {
    eco: string;
    name: string;
  };
}