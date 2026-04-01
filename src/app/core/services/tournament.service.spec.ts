import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TournamentService } from './tournament.service';
import { Tournament } from '../models/tournament.model';

describe('TournamentService', () => {
  let service: TournamentService;
  let httpMock: HttpTestingController;

  const mockTournamentWithLink: Tournament = {
    id: 'manila-open-2026',
    name: 'Manila Open 2026',
    status: 'upcoming',
    dates: { start: '2026-06-01', end: '2026-06-05' },
    location: 'SMX Convention Center',
    coordinates: { lat: 14.5338, lng: 120.9838 },
    format: 'Swiss System',
    timeControl: '90 min + 30 sec increment',
    entryFee: '₱500',
    registrationDeadline: '2026-05-25',
    prizePool: '₱100,000',
    organizer: 'NCFP',
    contact: 'info@ncfp.ph',
    link: 'https://www.facebook.com/ManilaOpen/posts/12345',
    description: 'Annual Manila chess open.',
    rounds: 9,
    participants: { current: 48, max: 128 },
  };

  const mockTournamentWithoutLink: Tournament = {
    id: 'cebu-classic-2026',
    name: 'Cebu Classic 2026',
    status: 'ongoing',
    dates: { start: '2026-03-15', end: '2026-03-20' },
    location: 'Cebu City',
    coordinates: { lat: 10.3157, lng: 123.8854 },
    format: 'Rapid',
    timeControl: '15 min + 10 sec increment',
    entryFee: '₱300',
    registrationDeadline: '2026-03-10',
    prizePool: '₱50,000',
    organizer: 'Cebu Chess Association',
    contact: 'cebu@chess.ph',
    description: 'Cebu rapid tournament.',
    rounds: 7,
    participants: { current: 64, max: 64 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TournamentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── FETCH TOURNAMENTS ─────────────────────────────────────────

  it('should fetch tournaments and include link field', () => {
    service.fetchTournaments();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments');
    expect(req.request.method).toBe('GET');
    req.flush({ data: [mockTournamentWithLink, mockTournamentWithoutLink] });

    expect(service.tournaments().length).toBe(2);
    expect(service.tournaments()[0].link).toBe('https://www.facebook.com/ManilaOpen/posts/12345');
    expect(service.tournaments()[1].link).toBeUndefined();
  });

  it('should fetch single tournament and include link field', () => {
    service.fetchTournament('manila-open-2026');

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/manila-open-2026');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockTournamentWithLink });

    const tournament = service.getTournamentById('manila-open-2026');
    expect(tournament).toBeDefined();
    expect(tournament!.link).toBe('https://www.facebook.com/ManilaOpen/posts/12345');
  });

  it('should fetch tournament without link and have undefined link', () => {
    service.fetchTournament('cebu-classic-2026');

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/cebu-classic-2026');
    req.flush({ data: mockTournamentWithoutLink });

    const tournament = service.getTournamentById('cebu-classic-2026');
    expect(tournament).toBeDefined();
    expect(tournament!.link).toBeUndefined();
  });

  // ─── CREATE TOURNAMENT ─────────────────────────────────────────

  it('should create tournament with link', () => {
    const payload = { name: 'New Tournament', link: 'https://facebook.com/new-event' };

    service.createMyTournament(payload).subscribe((tournament) => {
      expect(tournament.link).toBe('https://facebook.com/new-event');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/my/tournaments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: { ...mockTournamentWithLink, link: 'https://facebook.com/new-event' } });
  });

  it('should create tournament without link', () => {
    const payload = { name: 'No Link Tournament' };

    service.createMyTournament(payload).subscribe((tournament) => {
      expect(tournament.link).toBeUndefined();
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/my/tournaments');
    req.flush({ data: mockTournamentWithoutLink });
  });

  // ─── UPDATE TOURNAMENT ─────────────────────────────────────────

  it('should update tournament link', () => {
    const payload = { link: 'https://facebook.com/updated-link' };

    service.updateMyTournament('manila-open-2026', payload).subscribe((tournament) => {
      expect(tournament.link).toBe('https://facebook.com/updated-link');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/my/tournaments/manila-open-2026');
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { ...mockTournamentWithLink, link: 'https://facebook.com/updated-link' } });
  });

  it('should clear tournament link when set to null', () => {
    service.updateMyTournament('manila-open-2026', { link: null }).subscribe((tournament) => {
      expect(tournament.link).toBeUndefined();
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/my/tournaments/manila-open-2026');
    req.flush({ data: mockTournamentWithoutLink });
  });

  // ─── GET MY TOURNAMENTS ────────────────────────────────────────

  it('should get my tournaments with link field', () => {
    service.getMyTournaments().subscribe((tournaments) => {
      expect(tournaments.length).toBe(2);
      expect(tournaments[0].link).toBe('https://www.facebook.com/ManilaOpen/posts/12345');
      expect(tournaments[1].link).toBeUndefined();
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/my/tournaments');
    expect(req.request.method).toBe('GET');
    req.flush({ data: [mockTournamentWithLink, mockTournamentWithoutLink] });
  });
});
