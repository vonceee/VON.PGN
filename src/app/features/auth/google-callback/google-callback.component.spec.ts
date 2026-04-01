import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GoogleCallbackComponent } from './google-callback.component';
import { AuthService } from '../../../core/services/auth.service';

describe('GoogleCallbackComponent', () => {
  let component: GoogleCallbackComponent;
  let fixture: ComponentFixture<GoogleCallbackComponent>;
  let authServiceSpy: {
    handleGoogleCallback: ReturnType<typeof vi.fn>;
  };
  let routerSpy: {
    navigate: ReturnType<typeof vi.fn>;
  };

  function createComponent(queryParams: Record<string, string>) {
    authServiceSpy = {
      handleGoogleCallback: vi.fn().mockReturnValue(of(null)),
    };

    routerSpy = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [GoogleCallbackComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParams[key] ?? null,
              },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(GoogleCallbackComponent);
    component = fixture.componentInstance;
  }

  // ─── CREATION ──────────────────────────────────────────────────

  it('should create with a valid token', () => {
    createComponent({ token: 'valid-token-123' });
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // ─── SUCCESSFUL CALLBACK ──────────────────────────────────────

  it('should call handleGoogleCallback with the token', () => {
    createComponent({ token: 'valid-token-123' });
    fixture.detectChanges();

    expect(authServiceSpy.handleGoogleCallback).toHaveBeenCalledWith('valid-token-123');
  });

  it('should not set error on successful callback', () => {
    createComponent({ token: 'valid-token-123' });
    fixture.detectChanges();

    expect(component.error).toBeNull();
  });

  // ─── MISSING TOKEN ───────────────────────────────────────────

  it('should set error when no token is provided', () => {
    createComponent({});
    fixture.detectChanges();

    expect(component.error).toBe('No authentication token received.');
    expect(authServiceSpy.handleGoogleCallback).not.toHaveBeenCalled();
  });

  it('should redirect to login after 3s when no token', async () => {
    vi.useFakeTimers();
    createComponent({});
    fixture.detectChanges();

    vi.advanceTimersByTime(3000);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });

  // ─── ERROR PARAM ─────────────────────────────────────────────

  it('should set error when error param is present', () => {
    createComponent({ error: 'access_denied' });
    fixture.detectChanges();

    expect(component.error).toBe('Google authentication failed. Please try again.');
    expect(authServiceSpy.handleGoogleCallback).not.toHaveBeenCalled();
  });

  it('should redirect to login after 3s on error param', async () => {
    vi.useFakeTimers();
    createComponent({ error: 'access_denied' });
    fixture.detectChanges();

    vi.advanceTimersByTime(3000);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });

  // ─── CALLBACK FAILURE ────────────────────────────────────────

  it('should set error when handleGoogleCallback fails', () => {
    authServiceSpy = {
      handleGoogleCallback: vi.fn().mockReturnValue(throwError(() => new Error('Network error'))),
    };

    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [GoogleCallbackComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'token' ? 'bad-token' : null),
              },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(GoogleCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.error).toBe('Failed to complete sign-in. Please try again.');
  });

  it('should redirect to login after 3s on callback failure', async () => {
    vi.useFakeTimers();

    authServiceSpy = {
      handleGoogleCallback: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    };
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [GoogleCallbackComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'token' ? 'bad-token' : null),
              },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(GoogleCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    vi.advanceTimersByTime(3000);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });
});
