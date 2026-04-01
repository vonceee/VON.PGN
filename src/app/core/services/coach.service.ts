import { Injectable, signal } from '@angular/core';
import { Coach } from '../models/coach.model';

@Injectable({
  providedIn: 'root'
})
export class CoachService {
  private coachesData: Coach[] = [
    {
      id: 'yves-rañola',
      name: 'Yves Rañola',
      title: 'IM',
      shortInfo: 'The best way to learn fast is to observe, listen, practice, and play!',
      fideRating: 2368,
      hourlyRate: 'negotiable',
      profilePicture: 'assets/images/f7399af5-b7da-4d24-ada0-9e458fca0bab.jpg',
      playingExperience: [
        'Peak FIDE rating (2467)',
        'Multiple Times Philippine Representative in Asia & Europe Tournaments',
        '1992 National Junior Chess Champion'
      ],
      teachingExperience: [
        'FIDE Trainer (2007)',
        'Singapore ASEAN Chess Academy Trainer (2006-2010)',
        'Far Eastern University Head Coach (2011-2016)',
        'Philippine Chess Team Head Coach (2011-2016)',
        'Ateneo De Manila University Head Coach (2016-PRESENT)',
        'Former Coach of GM John Paul Gomez, IM Paulo Bersamina, and IM Cyrus Low'
      ],
      bio: 'Greetings! I am Yves Ranola from the Philippines, an International Master and a Chess coach by profession.',
      location: 'Caloocan City, Philippines',
      availability: 'Accepting Students.',
      teachingMethods: [
        'learner - centered method',
        'interactive and reflective',
        'high-quality resources and always up-to-date info',
      ],
      coachingType: 'Online & Onsite',
      socialMedia: {
        facebook: 'https://www.facebook.com/yves.ranola',
        lichess: 'https://lichess.org/@/General_Vishy'
      }
    },
    {
      id: 'luffe-magdalaga',
      name: 'Luffe Magdalaga',
      title: 'NM',
      shortInfo: 'Dedicated chess coach focused on building strong tactical foundations and tournament readiness.',
      fideRating: 2040,
      hourlyRate: 'negotiable',
      profilePicture: 'assets/images/4afc6b0b-6d57-41b8-8fac-5d1a8fd0b929.jpg',
      playingExperience: [
        'Former Varsity Player for the Far East University (FEU) Chess Team',
        'Multiple-time medalist in the Philippine National Age Group Chess Championships',
        'Active competitor in local and national open tournaments'
      ],
      teachingExperience: [
        'FEU Chess Coach (2018-2022)',
        '5+ years of 1-on-1 private coaching for kids and adult improvers',
        'HeadCoach for Ateneo De Manila University Chess Team (2022-PRESENT)'
      ],
      bio: 'Kamusta! I am NM Luffe Magdalaga, a passionate chess player and coach from the Philippines. My goal is to help aspiring players reach their full potential, whether you are aiming to win local tournaments or simply want to improve your online rating. We will focus on practical opening lines, sharpening your tactical vision, and mastering essential endgame techniques. Let\'s work together to take your game to the next level!',
      location: 'Metro Manila, Philippines (Timezone: PHT / GMT+8)',
      availability: 'Available for weekday evenings and flexible weekend slots.',
      teachingMethods: [
        'In-depth analysis of student\'s games',
        'Customized tactical and positional drills',
        'Building a practical opening repertoire',
        'Tournament psychology and time management'
      ],
      coachingType: 'Online & Onsite',
      socialMedia: {
        instagram: 'https://instagram.com/luffe_chess',
        youtube: 'https://youtube.com/@LuffeMagdalagaChess'
      }
    }
  ];

  coaches = signal<Coach[]>(this.coachesData);

  getCoachById(id: string): Coach | undefined {
    return this.coachesData.find(c => c.id === id);
  }
}