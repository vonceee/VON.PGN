export type PcapConference = 'alpha' | 'omega';
export type PcapDivision = PcapConference;

export type PcapPlayerRole = 'top_gun' | 'lady' | 'senior' | 'homegrown';

export type ChessMasterTitle =
  | 'GM'
  | 'IM'
  | 'FM'
  | 'CM'
  | 'WGM'
  | 'WIM'
  | 'WFM'
  | 'WCM'
  | 'NM'
  | 'WNM'
  | 'AGM'
  | 'AIM'
  | 'AFM'
  | 'ACM';

export interface ChessMasterTitleGroup {
  group: string;
  titles: { value: ChessMasterTitle; label: string }[];
}

export const CHESS_MASTER_TITLE_GROUPS: ChessMasterTitleGroup[] = [
  {
    group: 'FIDE Open Titles',
    titles: [
      { value: 'GM', label: 'GM - Grandmaster' },
      { value: 'IM', label: 'IM - International Master' },
      { value: 'FM', label: 'FM - FIDE Master' },
      { value: 'CM', label: 'CM - Candidate Master' }
    ]
  },
  {
    group: 'FIDE Women Titles',
    titles: [
      { value: 'WGM', label: 'WGM - Woman Grandmaster' },
      { value: 'WIM', label: 'WIM - Woman International Master' },
      { value: 'WFM', label: 'WFM - Woman FIDE Master' },
      { value: 'WCM', label: 'WCM - Woman Candidate Master' }
    ]
  },
  {
    group: 'National Titles',
    titles: [
      { value: 'NM', label: 'NM - National Master' },
      { value: 'WNM', label: 'WNM - Woman National Master' }
    ]
  },
  {
    group: 'FIDE Arena Titles',
    titles: [
      { value: 'AGM', label: 'AGM - Arena Grandmaster' },
      { value: 'AIM', label: 'AIM - Arena International Master' },
      { value: 'AFM', label: 'AFM - Arena FIDE Master' },
      { value: 'ACM', label: 'ACM - Arena Candidate Master' }
    ]
  }
];

export interface ChessFederation {
  code: string;
  name: string;
  flag: string;
}

export const CHESS_FEDERATIONS: ChessFederation[] = [
  { code: 'PHI', name: 'Philippines', flag: '🇵🇭' },
  { code: 'USA', name: 'United States', flag: '🇺🇸' },
  { code: 'IND', name: 'India', flag: '🇮🇳' },
  { code: 'CHN', name: 'China', flag: '🇨🇳' },
  { code: 'UZB', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VIE', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'INA', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'SGP', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MAS', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'THA', name: 'Thailand', flag: '🇹🇭' },
  { code: 'MYA', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵' },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'MGL', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'KAZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'ARM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AZE', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'GEO', name: 'Georgia', flag: '🇬🇪' },
  { code: 'UKR', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'GER', name: 'Germany', flag: '🇩🇪' },
  { code: 'FRA', name: 'France', flag: '🇫🇷' },
  { code: 'ESP', name: 'Spain', flag: '🇪🇸' },
  { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NOR', name: 'Norway', flag: '🇳🇴' },
  { code: 'POL', name: 'Poland', flag: '🇵🇱' },
  { code: 'HUN', name: 'Hungary', flag: '🇭🇺' },
  { code: 'ROU', name: 'Romania', flag: '🇷🇴' },
  { code: 'CZE', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'SRB', name: 'Serbia', flag: '🇷🇸' },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷' },
  { code: 'GRE', name: 'Greece', flag: '🇬🇷' },
  { code: 'TUR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'ISR', name: 'Israel', flag: '🇮🇱' },
  { code: 'IRI', name: 'Iran', flag: '🇮🇷' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZL', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦' },
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷' },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CUB', name: 'Cuba', flag: '🇨🇺' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PER', name: 'Peru', flag: '🇵🇪' },
  { code: 'CHI', name: 'Chile', flag: '🇨🇱' },
  { code: 'EGY', name: 'Egypt', flag: '🇪🇬' },
  { code: 'RSA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'FID', name: 'FIDE (Neutral)', flag: '🏳️' }
];

export function getFederationFlag(code?: string): string {
  if (!code) return '🇵🇭';
  const match = CHESS_FEDERATIONS.find(f => f.code.toUpperCase() === code.toUpperCase());
  return match ? match.flag : '🏳️';
}

export type PcapPlayerCategory = 'O' | 'L' | 'S' | 'HG' | 'HG/S' | 'HG/L' | 'F';

export interface PcapCategoryMeta {
  code: PcapPlayerCategory;
  label: string;
  boards: string;
  tooltip: string;
}

export const PCAP_CATEGORIES: PcapCategoryMeta[] = [
  { code: 'O', label: 'Open', boards: 'B1-B2', tooltip: 'O • Open Board (B1-B2)' },
  { code: 'L', label: 'Lady', boards: 'B3', tooltip: 'L • Lady Board (B3)' },
  { code: 'S', label: 'Senior', boards: 'B4', tooltip: 'S • Senior Board (B4)' },
  { code: 'HG', label: 'HomeGrown', boards: 'B5-B7', tooltip: 'HG • HomeGrown Boards (B5-B7)' },
  { code: 'HG/S', label: 'HomeGrown / Senior', boards: 'B4-B7', tooltip: 'HG/S • HomeGrown / Senior Board Eligibility' },
  { code: 'HG/L', label: 'HomeGrown / Lady', boards: 'B3, B5-B7', tooltip: 'HG/L • HomeGrown / Lady Board Eligibility' },
];

export interface PcapRosterPlayer {
  id: string;
  name: string;
  title?: ChessMasterTitle | string;
  rating: number | null;
  category?: PcapPlayerCategory;
  federation?: string;
  hometown?: string;
  winLossRecord?: string;
}

export interface PcapTeam {
  id: string;
  name: string;
  conference: PcapConference;
  wins: number;
  losses: number;
  draws: number;
  matchPoints: number;
  boardPointsFor: number;
  boardPointsAgainst: number;
  roster: PcapRosterPlayer[];
}

export interface PcapBoardMatchup {
  boardNumber: number;
  role: PcapPlayerRole;
  roleLabel: string;
  playerA: {
    name: string;
    title?: string;
    rating: number;
  };
  playerB: {
    name: string;
    title?: string;
    rating: number;
  };
  blitzScoreA: number; // 1, 0.5, 0
  blitzScoreB: number;
  rapidScoreA: number; // 2, 1, 0
  rapidScoreB: number;
  blitzPgn?: string;
  rapidPgn?: string;
}

export type PcapMatchStatus = 'upcoming' | 'completed';

export interface PcapMatch {
  id: string;
  round: number;
  conference: PcapConference | 'interconference';
  season: string;
  date: string;
  time: string;
  status: PcapMatchStatus;
  teamA: {
    id: string;
    name: string;
    conference: PcapConference;
  };
  teamB: {
    id: string;
    name: string;
    conference: PcapConference;
  };
  scoreA: number;
  scoreB: number;
  blitzScoreA: number;
  blitzScoreB: number;
  rapidScoreA: number;
  rapidScoreB: number;
  boards: PcapBoardMatchup[];
}

export interface PcapStanding {
  teamId: string;
  teamName: string;
  conference: PcapConference;
  matchesPlayed: number;
  won: number;
  drawn: number;
  lost: number;
  matchPoints: number;
  boardPointsFor: number;
  boardPointsAgainst: number;
  boardPointsDiff: number;
  form: ('W' | 'D' | 'L')[];
  rank: number;
}
