export const FIELD_LIMITS: Record<string, number> = {
  name: 64,
  description: 65535,
  location: 255,
  organizer: 255,
  contact: 255,
  link: 255,
  format: 255,
  timeControl: 255,
  registrationInstructions: 65535,
};

export interface MapCoordinates {
  lat: number;
  lng: number;
  name?: string;
}

export interface TournamentDateRange {
  start: string;
  end: string;
}

export type TournamentMode = 'admin' | 'user';
export type VerificationStatus = 'idle' | 'success' | 'error';
export type PosterTheme = 'dark' | 'light';

export const PRIZE_ORDER: Record<string, number> = {
  champion: 0,
  '1st_place': 1,
  '2nd_place': 2,
  '3rd_place': 3,
  '4th_place': 4,
  '5th_place': 5,
  '6th_place': 6,
  '7th_place': 7,
  '8th_place': 8,
  '9th_place': 9,
  '10th_place': 10,
};

export const comparePrizeKeys = (a: { key: string }, b: { key: string }): number => {
  const oa = PRIZE_ORDER[a.key];
  const ob = PRIZE_ORDER[b.key];
  if (oa !== undefined && ob !== undefined) return oa - ob;
  if (oa !== undefined) return -1;
  if (ob !== undefined) return 1;
  return a.key.localeCompare(b.key);
};
