export interface GameNarrativeSection {
  id?: string;
  title: string;
  order: number;
  content: string;
  startPly?: number;
  endPly?: number;
  keyMoveSan?: string;
}

export interface WorldChampionshipGame {
  id: string;
  matchId: string;
  gameNumber: number;
  title: string;
  subtitle?: string;
  white: string;
  black: string;
  result: string;
  date?: string;
  eco?: string;
  opening?: string;
  pgn: string;
  initialFen?: string;
  totalPlies?: number;
  narrativeOverview?: string;
  sections?: GameNarrativeSection[];
}

export interface MatchGameSummary {
  gameNumber: number;
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | string;
  eco?: string;
  opening?: string;
  date?: string;
  hasStory?: boolean;
  gameId?: string; // ID linking to WorldChampionshipGame if full story exists
  title?: string;
}

export interface WorldChampionshipMatch {
  id: string;
  year: number;
  displayYear?: string;
  title: string; // e.g. "1886 World Chess Championship"
  champion: string;
  challenger: string;
  winner: string;
  score: string;
  format: string; // e.g. "Best of 20", "First to 10 wins", "14 games classical + tiebreaks"
  location: string; // e.g. "New York, St. Louis & New Orleans, USA"
  description: string;
  keyHighlights: string[];
  gamesCount?: number;
  studyId?: number | string;
  studyTitle?: string;
  games?: WorldChampionshipGame[];
  gamesSummary?: MatchGameSummary[];
  coveredGamesCount?: number;
}

