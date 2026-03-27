export type TournamentStatus = 'upcoming' | 'ongoing' | 'past';

export interface Prizes {
  champion: string;
  '2nd_place': string;
  '3rd_place': string;
  '4th_place'?: string;
  '5th_place'?: string;
  '6th_to_10th'?: string;
  '11th_to_15th'?: string;
  [key: string]: string | undefined;
}

export interface SpecialAwards {
  [key: string]: string | { '1st': string; '2nd': string; '3rd': string };
}

export interface CategoryPrizes {
  eligibility: string[];
  prizes: Prizes;
  specialAwards?: SpecialAwards;
}

export interface ScheduleEvent {
  name: string;
  time: string;
}

export interface ScheduleDay {
  date: string;
  events: ScheduleEvent[];
}

export interface Tournament {
  id: string;
  name: string;
  bannerImage: string;
  status: TournamentStatus;
  dates: { start: string; end: string };
  location: string;
  coordinates: { lat: number; lng: number };
  format: string;
  timeControl: string;
  entryFee: string;
  registrationDeadline: string;
  prizePool: string;
  organizer: string;
  contactEmail: string;
  description: string;
  rounds: number;
  participants: { current: number; max: number };
  eligibility?: string[];
  categories?: { [key: string]: CategoryPrizes };
  schedule?: { [key: string]: ScheduleDay };
  winner?: string;
  standings?: { rank: number; player: string; score: number }[];
}
