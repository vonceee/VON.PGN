import { Injectable, signal } from '@angular/core';
import { Tournament, TournamentStatus } from '../models/tournament.model';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private tournamentsData: Tournament[] = [
    {
      id: 'manila-open-2026',
      name: 'Manila Open Chess Championship 2026',
      bannerImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&h=400&fit=crop',
      status: 'upcoming',
      dates: { start: '2026-04-15', end: '2026-04-20' },
      location: 'SMX Convention Center, Pasay City, Philippines',
      coordinates: { lat: 14.5349, lng: 120.9846 },
      format: 'Swiss System, 9 Rounds',
      timeControl: '90 min + 30 sec increment',
      entryFee: '₱2,500',
      registrationDeadline: '2026-04-10',
      prizePool: '₱100,000',
      organizer: 'National Chess Federation of the Philippines',
      contactEmail: 'tournaments@ncfph.org',
      description: 'The Manila Open Chess Championship returns for its 12th edition! Open to players of all nationalities and ratings. This FIDE-rated event brings together the best players in Southeast Asia for an exciting week of competitive chess. Early registration is encouraged as slots are limited.',
      rounds: 9,
      participants: { current: 87, max: 128 },
      winner: undefined,
      standings: undefined,
      eligibility: [
        'Bonafide NCFP member',
        'FIDE standard rating 2099 and below',
        'Must present valid FIDE ID upon registration'
      ],
      categories: {
        'open': {
          eligibility: [
            'Bonafide NCFP member',
            'FIDE standard rating 2099 and under'
          ],
          prizes: {
            champion: '₱50,000 + trophy & certificate',
            '2nd_place': '₱30,000 + medal & certificate',
            '3rd_place': '₱20,000 + medal & certificate',
            '4th_place': '₱10,000 + medal & certificate',
            '5th_place': '₱7,000 + medal & certificate',
            '6th_to_10th': '₱4,000 + medal & certificate',
            '11th_to_15th': '₱2,000 + certificate'
          },
          specialAwards: {
            'Top Lady': { '1st': '₱5,000 + medal & certificate', '2nd': '₱3,000 + medal & certificate', '3rd': '₱2,000 + medal & certificate' },
            'Top Senior': { '1st': '₱3,000 + medal & certificate', '2nd': '₱2,000 + medal & certificate', '3rd': '₱1,500 + medal & certificate' },
            'Top Junior': { '1st': '₱3,000 + medal & certificate', '2nd': '₱2,000 + medal & certificate', '3rd': '₱1,500 + medal & certificate' },
            'Top Youth': '₱3,000 + medal & certificate',
            'Top Kiddie': '₱3,000 + medal & certificate',
            '64th Placer': '₱1,000'
          }
        },
        'under_14': {
          eligibility: [
            'Bonafide NCFP member',
            'Born 2012 and later'
          ],
          prizes: {
            champion: '₱20,000 + medal & certificate',
            '2nd_place': '₱12,000 + medal & certificate',
            '3rd_place': '₱8,000 + medal & certificate',
            '4th_place': '₱5,000 + medal & certificate',
            '5th_place': '₱3,000 + medal & certificate',
            '6th_to_10th': '₱2,000 + medal & certificate'
          },
          specialAwards: {
            'Top Girl': { '1st': '₱3,000 + medal & certificate', '2nd': '₱2,000 + medal & certificate', '3rd': '₱1,500 + medal & certificate' },
            'Top 8 Years Old & Under': '₱2,000 + medal & certificate',
            'Top 10 Years Old & Under': '₱2,000 + medal & certificate',
            'Top 12 Years Old & Under': '₱2,000 + medal & certificate'
          }
        }
      },
      schedule: {
        'day_1': {
          date: '2026-04-15',
          events: [
            { name: 'Registration & Check-in', time: '7:00 AM – 8:30 AM' },
            { name: 'Opening Ceremony', time: '8:30 AM – 9:00 AM' },
            { name: 'Round 1', time: '9:00 AM – 1:00 PM' },
            { name: 'Round 2', time: '2:00 PM – 6:00 PM' }
          ]
        },
        'day_2': {
          date: '2026-04-16',
          events: [
            { name: 'Round 3', time: '9:00 AM – 1:00 PM' },
            { name: 'Round 4', time: '2:00 PM – 6:00 PM' }
          ]
        },
        'day_3': {
          date: '2026-04-17',
          events: [
            { name: 'Round 5', time: '9:00 AM – 1:00 PM' },
            { name: 'Round 6', time: '2:00 PM – 6:00 PM' }
          ]
        },
        'day_4': {
          date: '2026-04-18',
          events: [
            { name: 'Round 7', time: '9:00 AM – 1:00 PM' },
            { name: 'Round 8', time: '2:00 PM – 6:00 PM' }
          ]
        },
        'day_5': {
          date: '2026-04-19',
          events: [
            { name: 'Round 9', time: '9:00 AM – 1:00 PM' },
            { name: 'Closing & Awarding Ceremony', time: '3:00 PM – 5:00 PM' }
          ]
        }
      }
    },
    {
      id: 'asean-youth-chess-2026',
      name: 'ASEAN Youth Chess Championship 2026',
      bannerImage: 'https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=1200&h=400&fit=crop',
      status: 'ongoing',
      dates: { start: '2026-03-20', end: '2026-03-30' },
      location: 'Grand Hyatt Manila, BGC, Philippines',
      coordinates: { lat: 14.5515, lng: 121.0506 },
      format: 'Round Robin, 7 Rounds',
      timeControl: '60 min + 30 sec increment',
      entryFee: '₱1,500',
      registrationDeadline: '2026-03-15',
      prizePool: '₱200,000',
      organizer: 'ASEAN Chess Federation',
      contactEmail: 'info@aseanchess.org',
      description: 'The premier youth chess event in Southeast Asia. Players aged 8-18 from all ASEAN member nations compete for regional glory and the chance to represent their countries at the World Youth Chess Championship. Categories include U8, U10, U12, U14, U16, and U18 for both Open and Girls sections.',
      rounds: 7,
      participants: { current: 64, max: 64 },
      winner: undefined,
      standings: undefined
    },
    {
      id: 'pasig-rapid-2026',
      name: 'Pasig Rapid Chess Open 2026',
      bannerImage: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=1200&h=400&fit=crop',
      status: 'upcoming',
      dates: { start: '2026-05-03', end: '2026-05-03' },
      location: 'Pasig City Sports Complex, Pasig, Philippines',
      coordinates: { lat: 14.5764, lng: 121.0851 },
      format: 'Swiss System, 7 Rounds',
      timeControl: '15 min + 10 sec increment',
      entryFee: '₱500',
      registrationDeadline: '2026-05-01',
      prizePool: '₱80,000',
      organizer: 'Pasig Chess Club',
      contactEmail: 'pasigchess@gmail.com',
      description: 'A one-day rapid chess tournament perfect for players who want a quick competitive experience. All ages and ratings welcome. Trophies for the top 10 finishers and special prizes for top female, top senior, and top junior players. Onsite registration available but online pre-registration is preferred.',
      rounds: 7,
      participants: { current: 42, max: 100 },
      winner: undefined,
      standings: undefined,
      eligibility: [
        'Open to all nationalities and rating levels',
        'Valid FIDE ID or NCFP membership'
      ],
      schedule: {
        'day_1': {
          date: '2026-05-03',
          events: [
            { name: 'Registration & Check-in', time: '7:30 AM – 8:30 AM' },
            { name: 'Opening Ceremony', time: '8:30 AM – 9:00 AM' },
            { name: 'Round 1', time: '9:00 AM – 10:00 AM' },
            { name: 'Round 2', time: '10:10 AM – 11:10 AM' },
            { name: 'Round 3', time: '11:20 AM – 12:20 PM' },
            { name: 'Lunch Break', time: '12:20 PM – 1:20 PM' },
            { name: 'Round 4', time: '1:20 PM – 2:20 PM' },
            { name: 'Round 5', time: '2:30 PM – 3:30 PM' },
            { name: 'Round 6', time: '3:40 PM – 4:40 PM' },
            { name: 'Round 7', time: '4:50 PM – 5:50 PM' },
            { name: 'Awarding Ceremony', time: '6:15 PM' }
          ]
        }
      }
    },
    {
      id: 'quezon-invitational-2025',
      name: 'Quezon City Invitational Masters 2025',
      bannerImage: 'https://images.unsplash.com/photo-1560174038-51f4b4c22f1d?w=1200&h=400&fit=crop',
      status: 'past',
      dates: { start: '2025-11-10', end: '2025-11-17' },
      location: 'Novotel Manila Araneta City, Quezon City, Philippines',
      coordinates: { lat: 14.6186, lng: 121.0510 },
      format: 'Round Robin, 10 Rounds',
      timeControl: '90 min + 30 sec increment',
      entryFee: 'Invitational (No Entry Fee)',
      registrationDeadline: '2025-10-25',
      prizePool: '₱300,000',
      organizer: 'Quezon City Chess Association',
      contactEmail: 'qcchess2025@gmail.com',
      description: 'An elite invitational tournament featuring 10 of the strongest players in the Philippines. This prestigious event showcases the highest level of chess talent in the country and serves as a qualifier for international representation. All games are broadcast live with expert commentary.',
      rounds: 10,
      participants: { current: 10, max: 10 },
      winner: 'GM John Paul Gomez',
      standings: [
        { rank: 1, player: 'GM John Paul Gomez', score: 7.5 },
        { rank: 2, player: 'IM Paulo Bersamina', score: 7.0 },
        { rank: 3, player: 'GM Mark Paragua', score: 6.5 },
        { rank: 4, player: 'IM Daniel Quizon', score: 6.0 },
        { rank: 5, player: 'IM Jan Emmanuel Garcia', score: 5.5 },
        { rank: 6, player: 'IM Paulo Bersamina', score: 5.0 },
        { rank: 7, player: 'FM Nelson Mariano III', score: 4.5 },
        { rank: 8, player: 'IM Richeliieu Salcedo III', score: 4.0 },
        { rank: 9, player: 'IM Kim Steven Yap', score: 3.5 },
        { rank: 10, player: 'IM Haridas Pascua', score: 2.5 }
      ]
    },
    {
      id: 'makati-weekend-blitz-2025',
      name: 'Makati Weekend Blitz Series 2025',
      bannerImage: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=400&fit=crop',
      status: 'past',
      dates: { start: '2025-12-06', end: '2025-12-07' },
      location: 'Ayala Museum Function Hall, Makati, Philippines',
      coordinates: { lat: 14.5544, lng: 121.0205 },
      format: 'Swiss System, 9 Rounds',
      timeControl: '3 min + 2 sec increment',
      entryFee: '₱300',
      registrationDeadline: '2025-12-04',
      prizePool: '₱50,000',
      organizer: 'Makati Blitz Chess Club',
      contactEmail: 'makatiblitz@outlook.com',
      description: 'A thrilling weekend blitz chess event in the heart of Makati business district. Fast-paced games, exciting finishes, and a vibrant chess community atmosphere. Open to all players regardless of rating. Side events include a puzzle-solving competition and a simul exhibition by a guest GM.',
      rounds: 9,
      participants: { current: 48, max: 48 },
      winner: 'IM Cyrus Low',
      standings: [
        { rank: 1, player: 'IM Cyrus Low', score: 8.0 },
        { rank: 2, player: 'FM Roel Abelgas', score: 7.5 },
        { rank: 3, player: 'NM Luffe Magdalaga', score: 7.0 },
        { rank: 4, player: 'John Dave Lavandero', score: 6.5 },
        { rank: 5, player: 'Jerome Villanueva', score: 6.0 }
      ]
    }
  ];

  tournaments = signal<Tournament[]>(this.tournamentsData);

  getTournamentById(id: string): Tournament | undefined {
    return this.tournamentsData.find(t => t.id === id);
  }

  getByStatus(status: TournamentStatus): Tournament[] {
    return this.tournamentsData.filter(t => t.status === status);
  }
}
