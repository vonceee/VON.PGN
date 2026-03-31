import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BookmarksComponent } from './bookmarks.component';
import { TournamentService } from '../../core/services/tournament.service';
import { ToastService } from '../../core/services/toast.service';
import { Tournament } from '../../core/models/tournament.model';

describe('BookmarksComponent', () => {
  let component: BookmarksComponent;
  let fixture: ComponentFixture<BookmarksComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const mockTournaments: Tournament[] = [
    {
      id: 'manila-open-2026',
      name: 'Manila Open 2026',
      status: 'upcoming',
      dates: { start: '2026-05-01', end: '2026-05-03' },
      location: 'Manila, Philippines',
      coordinates: { lat: 14.5995, lng: 120.9842 },
      format: 'Standard',
      timeControl: '90+30',
      entryFee: '₱500',
      registrationDeadline: '2026-04-25',
      prizePool: '₱50,000',
      organizer: 'NCFP',
      contact: 'info@ncfp.ph',
      description: 'Annual Manila chess open.',
      rounds: 9,
      participants: { current: 48, max: 128 },
      isBookmarked: true,
    },
    {
      id: 'cebu-classic-2026',
      name: 'Cebu Classic 2026',
      status: 'ongoing',
      dates: { start: '2026-03-15', end: '2026-03-20' },
      location: 'Cebu City, Philippines',
      coordinates: { lat: 10.3157, lng: 123.8854 },
      format: 'Rapid',
      timeControl: '15+10',
      entryFee: '₱300',
      registrationDeadline: '2026-03-10',
      prizePool: '₱20,000',
      organizer: 'Cebu Chess Association',
      contact: 'cebu@chess.ph',
      description: 'Cebu rapid tournament.',
      rounds: 7,
      participants: { current: 64, max: 64 },
      isBookmarked: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookmarksComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookmarksComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── INITIALIZATION ─────────────────────────────────────────────

  it('should create', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    req.flush({ data: [] });
    expect(component).toBeTruthy();
  });

  it('should load bookmarked tournaments on init', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockTournaments });

    expect(component.tournaments().length).toBe(2);
    expect(component.tournaments()[0].name).toBe('Manila Open 2026');
    expect(component.tournaments()[1].name).toBe('Cebu Classic 2026');
  });

  it('should set loading to false after successful load', () => {
    fixture.detectChanges();
    expect(component.loading()).toBe(true);

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    req.flush({ data: mockTournaments });

    expect(component.loading()).toBe(false);
  });

  it('should set loading to false after failed load', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
  });

  it('should show toast on load error', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });

    expect(toastSpy).toHaveBeenCalledWith('Failed to load bookmarks', 'error');
  });

  it('should have empty tournaments initially before response', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');

    expect(component.tournaments().length).toBe(0);
    expect(component.loading()).toBe(true);

    req.flush({ data: [] });
  });

  // ─── REMOVE BOOKMARK ────────────────────────────────────────────

  it('should remove bookmark and update list', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    loadReq.flush({ data: mockTournaments });

    expect(component.tournaments().length).toBe(2);

    component.removeBookmark(mockTournaments[0]);

    const toggleReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/manila-open-2026/bookmark');
    expect(toggleReq.request.method).toBe('POST');
    toggleReq.flush({ is_bookmarked: false, message: 'Bookmark removed' });

    expect(component.tournaments().length).toBe(1);
    expect(component.tournaments()[0].id).toBe('cebu-classic-2026');
  });

  it('should set removingId during bookmark removal', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    loadReq.flush({ data: mockTournaments });

    component.removeBookmark(mockTournaments[0]);
    expect(component.removingId()).toBe('manila-open-2026');

    const toggleReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/manila-open-2026/bookmark');
    toggleReq.flush({ is_bookmarked: false, message: 'Bookmark removed' });

    expect(component.removingId()).toBeNull();
  });

  it('should not allow removing while another removal is in progress', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    loadReq.flush({ data: mockTournaments });

    component.removeBookmark(mockTournaments[0]);
    expect(component.removingId()).toBe('manila-open-2026');

    component.removeBookmark(mockTournaments[1]);

    // Only one request should be made
    httpMock.expectNone('http://127.0.0.1:8000/api/tournaments/cebu-classic-2026/bookmark');

    // Flush the first request
    const toggleReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/manila-open-2026/bookmark');
    toggleReq.flush({ is_bookmarked: false, message: 'Bookmark removed' });

    expect(component.tournaments().length).toBe(1);
  });

  it('should show toast on successful bookmark removal', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    loadReq.flush({ data: mockTournaments });

    component.removeBookmark(mockTournaments[0]);
    const toggleReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/manila-open-2026/bookmark');
    toggleReq.flush({ is_bookmarked: false, message: 'Bookmark removed' });

    expect(toastSpy).toHaveBeenCalledWith('Bookmark removed', 'success');
  });

  it('should show toast on failed bookmark removal', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    loadReq.flush({ data: mockTournaments });

    component.removeBookmark(mockTournaments[0]);
    const toggleReq = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/manila-open-2026/bookmark');
    toggleReq.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });

    expect(toastSpy).toHaveBeenCalledWith('Failed to remove bookmark', 'error');
    expect(component.removingId()).toBeNull();
    expect(component.tournaments().length).toBe(2);
  });

  // ─── FORMAT DATE ────────────────────────────────────────────────

  it('should format date correctly', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tournaments/bookmarks');
    req.flush({ data: [] });

    const formatted = component.formatDate('2026-05-01');
    expect(formatted).toBe('May 1, 2026');
  });
});
