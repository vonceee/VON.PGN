export type WorldChampionshipEra =
  | 'Early Classical (1886-1946)'
  | 'FIDE Soviet Era (1948-1990)'
  | 'Split Era (1993-2005)'
  | 'Modern Era (2006-Present)';

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
  era: WorldChampionshipEra;
  description: string;
  keyHighlights: string[];
  gamesCount?: number;
  studyId?: number | string;
  studyTitle?: string;
}
