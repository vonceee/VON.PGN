import { Coach } from './coach.model';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface CoachApplication extends Coach {
  email: string;
  submittedAt: Date;
  status: ApplicationStatus;
  profilePictureUrl?: string;
}