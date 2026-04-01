import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { TournamentDetailComponent } from './tournament-detail.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { Tournament } from '../../../core/models/tournament.model';

describe('TournamentDetailComponent', () => {
  let component: TournamentDetailComponent;
  let fixture: ComponentFixture<TournamentDetailComponent>;
  let httpMock: HttpTestingController;
  let tournamentService: TournamentService;

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

  async function setupComponent(tournament: Tournament) {
    await TestBed.configureTestingModule({
      imports: [TournamentDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => tournament.id,
              },
            },
            paramMap: { subscribe: (cb: (params: { get: (key: string) => string | null }) => void) => cb({ get: () => tournament.id }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    tournamentService = TestBed.inject(TournamentService);

    // Pre-populate the service so the effect picks up the data immediately
    tournamentService.tournaments.set([tournament]);

    // This triggers ngOnInit which calls fetchTournament
    fixture.detectChanges();

    // Flush the HTTP request triggered by ngOnInit
    const req = httpMock.expectOne(`http://127.0.0.1:8000/api/tournaments/${tournament.id}`);
    req.flush({ data: tournament, is_bookmarked: false });

    // Wait for the effect to process
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  // ─── LINK DISPLAY ──────────────────────────────────────────────

  it('should render clickable link when tournament has link', async () => {
    await setupComponent(mockTournamentWithLink);

    const linkEl = fixture.nativeElement.querySelector('a[href="https://www.facebook.com/ManilaOpen/posts/12345"]');
    expect(linkEl).toBeTruthy();
    expect(linkEl.getAttribute('target')).toBe('_blank');
    expect(linkEl.getAttribute('rel')).toBe('noopener noreferrer');
    expect(linkEl.textContent).toContain('View Updates');
  });

  it('should not render View Updates link when tournament has no link', async () => {
    await setupComponent(mockTournamentWithoutLink);

    const viewUpdatesLinks = fixture.nativeElement.querySelectorAll('a');
    const hasViewUpdates = Array.from(viewUpdatesLinks as NodeListOf<HTMLAnchorElement>).some(
      (a) => a.textContent?.trim() === 'View Updates'
    );
    expect(hasViewUpdates).toBe(false);
  });

  it('should open link in new tab with security attributes', async () => {
    await setupComponent(mockTournamentWithLink);

    const linkEl: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'a[href="https://www.facebook.com/ManilaOpen/posts/12345"]'
    );
    expect(linkEl).toBeTruthy();
    expect(linkEl.target).toBe('_blank');
    expect(linkEl.rel).toContain('noopener');
    expect(linkEl.rel).toContain('noreferrer');
  });

  // ─── TOURNAMENT DATA ───────────────────────────────────────────

  it('should display tournament name', async () => {
    await setupComponent(mockTournamentWithLink);

    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Manila Open 2026');
  });

  it('should display organizer and contact information', async () => {
    await setupComponent(mockTournamentWithLink);

    expect(fixture.nativeElement.textContent).toContain('NCFP');
    expect(fixture.nativeElement.textContent).toContain('info@ncfp.ph');
  });

  // ─── FORMAT VIEW COUNT ─────────────────────────────────────────

  it('should format view count correctly', async () => {
    await setupComponent(mockTournamentWithLink);

    expect(component.formatViewCount(0)).toBe('0');
    expect(component.formatViewCount(undefined)).toBe('0');
    expect(component.formatViewCount(500)).toBe('500');
    expect(component.formatViewCount(1500)).toBe('1.5K');
    expect(component.formatViewCount(1500000)).toBe('1.5M');
  });
});
