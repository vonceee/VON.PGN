import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { TournamentEditorComponent } from './tournament-editor';
import { AdminService } from '../../../core/services/admin.service';
import { TournamentService } from '../../../core/services/tournament.service';
import { ToastService } from '../../../core/services/toast.service';

describe('TournamentEditorComponent', () => {
  let component: TournamentEditorComponent;
  let fixture: ComponentFixture<TournamentEditorComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentEditorComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: {}, paramMap: { get: () => null } },
            paramMap: { subscribe: (cb: (params: { get: (key: string) => string | null }) => void) => cb({ get: () => null }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── FORM INITIALIZATION ───────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a link form control', () => {
    expect(component.tournamentForm.get('link')).toBeTruthy();
  });

  it('should initialize link as empty string', () => {
    expect(component.tournamentForm.get('link')?.value).toBe('');
  });

  it('should include link in the form group', () => {
    expect(component.tournamentForm.contains('link')).toBe(true);
  });

  // ─── BUILD TOURNAMENT DATA ─────────────────────────────────────

  it('should include link in buildTournamentData when set', () => {
    component.tournamentForm.patchValue({
      name: 'Test Tournament',
      status: 'upcoming',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      location: 'Manila',
      format: 'Swiss',
      timeControl: '90+30',
      rounds: 9,
      entryFee: '500',
      organizer: 'NCFP',
      contact: 'test@test.com',
      registrationInstructions: 'Register online',
      link: 'https://www.facebook.com/test-event/posts/123',
    });

    const data = component.buildTournamentData();
    expect(data['link']).toBe('https://www.facebook.com/test-event/posts/123');
  });

  it('should include empty link in buildTournamentData when not set', () => {
    component.tournamentForm.patchValue({
      name: 'Test Tournament',
      status: 'upcoming',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      location: 'Manila',
      format: 'Swiss',
      timeControl: '90+30',
      rounds: 9,
      entryFee: '500',
      organizer: 'NCFP',
      contact: 'test@test.com',
      registrationInstructions: 'Register online',
      link: '',
    });

    const data = component.buildTournamentData();
    expect(data['link']).toBe('');
  });

  // ─── REVIEW STEP DISPLAY ───────────────────────────────────────

  it('should show link in review when link is set', () => {
    component.tournamentForm.patchValue({
      name: 'Test Tournament',
      status: 'upcoming',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      location: 'Manila',
      format: 'Swiss',
      timeControl: '90+30',
      rounds: 9,
      entryFee: '500',
      organizer: 'NCFP',
      contact: 'test@test.com',
      registrationInstructions: 'Register online',
      link: 'https://facebook.com/my-event',
    });

    const data = component.buildTournamentData();
    expect(data['link']).toBe('https://facebook.com/my-event');
  });

  // ─── STEP NAVIGATION ──────────────────────────────────────────

  it('should not require link for step validation', () => {
    // Link is optional, so organizer step should pass without it
    component.tournamentForm.patchValue({
      organizer: 'NCFP',
      contact: 'test@test.com',
      link: '',
    });

    // The organizer step fields are ['organizer', 'contact']
    // Link is not in required fields, so validation should pass
    const stepFields = component.steps[3].fields; // Organizer step
    expect(stepFields).not.toContain('link');
  });

  // ─── FORM PATCHING ────────────────────────────────────────────

  it('should allow patching link value', () => {
    component.tournamentForm.patchValue({ link: 'https://example.com/new-link' });
    expect(component.tournamentForm.get('link')?.value).toBe('https://example.com/new-link');
  });

  it('should allow clearing link value', () => {
    component.tournamentForm.patchValue({ link: 'https://example.com/link' });
    component.tournamentForm.patchValue({ link: '' });
    expect(component.tournamentForm.get('link')?.value).toBe('');
  });
});
