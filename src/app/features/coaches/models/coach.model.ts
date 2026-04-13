export interface Coach {
  id: string;
  name: string;
  title: string;
  shortInfo: string;
  fideRating: number;
  profilePicture: string;
  isAcademyInstructor?: boolean;
  
  // In-depth info
  playingExperience: string[];
  teachingExperience: string[];
  bio: string;
  location: string;
  availability: string;
  teachingMethods: string[];
  coachingType: 'Online' | 'Onsite' | 'Online & Onsite';
  socialMedia: {
    twitter?: string;
    youtube?: string;
    twitch?: string;
    instagram?: string;
    facebook?: string;
    chesscom?: string;
    lichess?: string;
  };
}