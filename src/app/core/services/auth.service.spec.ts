import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthResponse } from './auth.service';
import { UserService } from './user.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockUser = {
    uid: '1',
    email: 'test@example.com',
    username: 'testuser',
    email_verified_at: '2026-01-01T00:00:00Z',
    preferences: { theme: 'system', boardStyle: 'classic', pieceStyle: 'standard', soundEnabled: true },
    progress: {
      completedLessonIds: [],
      lastActiveLessonId: null,
      totalPuzzlesSolved: 0,
      currentStreakDays: 0,
      experiencePoints: 0,
      currentLevel: 1,
      puzzleRating: 1200,
      puzzleStreak: 0,
      earnedBadges: [],
    },
  };

  const mockAuthResponse: AuthResponse = {
    message: 'User successfully registered',
    access_token: 'mock-token-123',
    token_type: 'Bearer',
    user: mockUser,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ─── REGISTER ────────────────────────────────────────────────────

  it('should register a new user and store token', () => {
    const registerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    };

    service.register(registerData).subscribe((res) => {
      expect(res.access_token).toBe('mock-token-123');
      expect(res.user.email).toBe('test@example.com');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(registerData);
    req.flush(mockAuthResponse);

    expect(localStorage.getItem('chess_auth_token')).toBe('mock-token-123');
  });

  it('should set currentUser on successful registration with verified email', () => {
    service.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    }).subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/register');
    req.flush(mockAuthResponse);

    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should redirect to verify-email when registered user has unverified email', () => {
    const unverifiedResponse: AuthResponse = {
      ...mockAuthResponse,
      user: { ...mockUser, email_verified_at: null },
    };

    service.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    }).subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/register');
    req.flush(unverifiedResponse);

    expect(service.currentUser()).toBeNull();
    expect(service.unverifiedEmail()).toBe('test@example.com');
    expect(router.navigate).toHaveBeenCalledWith(['/verify-email']);
  });

  // ─── LOGIN ───────────────────────────────────────────────────────

  it('should login with valid credentials and store token', () => {
    service.login({ email: 'test@example.com', password: 'Password123' }).subscribe((res) => {
      expect(res.access_token).toBe('mock-token-123');
      expect(res.user.email).toBe('test@example.com');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com', password: 'Password123' });
    req.flush(mockAuthResponse);

    expect(localStorage.getItem('chess_auth_token')).toBe('mock-token-123');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should navigate to /profile on successful login', () => {
    service.login({ email: 'test@example.com', password: 'Password123' }).subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/login');
    req.flush(mockAuthResponse);

    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should propagate login errors', () => {
    service.login({ email: 'test@example.com', password: 'wrong' }).subscribe({
      next: () => expect.fail('should have failed'),
      error: (err) => {
        expect(err.status).toBe(422);
      },
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/login');
    req.flush(
      { errors: { email: ['invalid credentials.'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  });

  // ─── LOGOUT ──────────────────────────────────────────────────────

  it('should clear auth state on logout', () => {
    localStorage.setItem('chess_auth_token', 'mock-token-123');
    service.currentUser.set(mockUser as any);

    service.logout();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Successfully logged out' });

    expect(localStorage.getItem('chess_auth_token')).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should navigate to /login after logout', () => {
    localStorage.setItem('chess_auth_token', 'mock-token-123');

    service.logout();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/logout');
    req.flush({ message: 'Successfully logged out' });

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  // ─── TOKEN MANAGEMENT ────────────────────────────────────────────

  it('should return null when no token exists', () => {
    expect(service.getToken()).toBeNull();
  });

  it('should return stored token', () => {
    localStorage.setItem('chess_auth_token', 'my-token');
    expect(service.getToken()).toBe('my-token');
  });

  it('should compute isAuthenticated as false when no user', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should compute isAuthenticated as true when user is set', () => {
    service.currentUser.set(mockUser);
    expect(service.isAuthenticated()).toBe(true);
  });

  // ─── INIT AUTH ───────────────────────────────────────────────────

  it('should set isInitialized to true when no token exists', () => {
    service.initAuth().subscribe((val) => {
      expect(val).toBeNull();
    });
    expect(service.isInitialized()).toBe(true);
  });

  it('should load profile when token exists', () => {
    localStorage.setItem('chess_auth_token', 'existing-token');

    service.initAuth().subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/profile');
    req.flush({ data: mockUser });

    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isInitialized()).toBe(true);
  });

  // ─── PASSWORD RESET ──────────────────────────────────────────────

  it('should send forgot password request', () => {
    service.sendPasswordResetLink('test@example.com').subscribe((res) => {
      expect(res.message).toBe('Reset link sent');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/forgot-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com' });
    req.flush({ message: 'Reset link sent' });
  });

  it('should send reset password request', () => {
    const data = { email: 'test@example.com', password: 'NewPass123', password_confirmation: 'NewPass123', token: 'abc' };

    service.resetPassword(data).subscribe((res) => {
      expect(res.message).toBe('Password reset');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/reset-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({ message: 'Password reset' });
  });

  // ─── RESEND VERIFICATION EMAIL ──────────────────────────────────

  it('should resend verification email', () => {
    localStorage.setItem('chess_auth_token', 'my-token');

    service.resendVerificationEmail().subscribe((res) => {
      expect(res.message).toBe('Verification link sent!');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/email/verification-notification');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({ message: 'Verification link sent!' });
  });

  // ─── UPDATE EMAIL ────────────────────────────────────────────────

  it('should update email and set unverifiedEmail signal', () => {
    localStorage.setItem('chess_auth_token', 'my-token');

    service.updateEmail('new@example.com').subscribe((res) => {
      expect(res.user.email).toBe('new@example.com');
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/email/update');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ email: 'new@example.com' });
    req.flush({
      message: 'Email updated',
      user: { ...mockUser, email: 'new@example.com', email_verified_at: null },
    });

    expect(service.unverifiedEmail()).toBe('new@example.com');
  });

  // ─── GOOGLE CALLBACK ──────────────────────────────────────────

  it('should store token and load profile on Google callback', () => {
    service.handleGoogleCallback('google-token-123').subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/profile');
    req.flush({ data: mockUser });

    expect(localStorage.getItem('chess_auth_token')).toBe('google-token-123');
    expect(service.currentUser()).toEqual(mockUser);
  });

  it('should navigate to /profile on successful Google callback', () => {
    service.handleGoogleCallback('google-token-123').subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/profile');
    req.flush({ data: mockUser });

    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should clear auth and navigate to /login on Google callback failure', () => {
    service.handleGoogleCallback('bad-token').subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/profile');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('chess_auth_token')).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
