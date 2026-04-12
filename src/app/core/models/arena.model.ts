export type ArenaStatus = 'upcoming' | 'ongoing' | 'past';

export interface Arena {
  id: string;
  name: string;
  status: ArenaStatus;
  start_date: string;
  end_date: string;
  timeControl: string;
  durationMinutes: number;
  participantsCount: number;
  winner?: string;
  standings?: any[];
  createdAt: string;
  creator?: {
    id: number;
    name: string;
    verified_organizer: boolean;
  };
}
