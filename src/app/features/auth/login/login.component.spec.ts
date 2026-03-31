import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: {
    login: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authServiceSpy = {
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up any intervals
    if ((component as any).lockoutTimer) {
      clearInterval((component as any).lockoutTimer);
    }
  });

  // ─── CREATION ────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should initialize with isLoading false', () => {
    expect(component.isLoading).toBe(false);
  });

  it('should initialize with empty errorMessage', () => {
    expect(component.errorMessage).toBe('');
  });

  it('should initialize with zero loginAttempts', () => {
    expect(component.loginAttempts).toBe(0);
  });

  it('should not be locked out initially', () => {
    expect(component.isLockedOut).toBe(false);
  });

  // ─── FORM VALIDATION ────────────────────────────────────────────

  it('should be invalid when empty', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('should require email', () => {
    component.loginForm.patchValue({ email: '', password: 'Password123' });
    expect(component.loginForm.get('email')?.hasError('required')).toBe(true);
  });

  it('should require valid email format', () => {
    component.loginForm.patchValue({ email: 'not-an-email' });
    expect(component.loginForm.get('email')?.hasError('email')).toBe(true);

    component.loginForm.patchValue({ email: 'valid@email.com' });
    expect(component.loginForm.get('email')?.hasError('email')).toBe(false);
  });

  it('should require password', () => {
    component.loginForm.patchValue({ email: 'test@example.com', password: '' });
    expect(component.loginForm.get('password')?.hasError('required')).toBe(true);
  });

  it('should be valid with email and password', () => {
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'Password123',
    });
    expect(component.loginForm.valid).toBe(true);
  });

  // ─── FORM SUBMISSION ────────────────────────────────────────────

  it('should not submit when form is invalid', () => {
    component.onSubmit();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should call authService.login on valid submission', () => {
    authServiceSpy.login.mockReturnValue(of({} as any));

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'Password123',
    });

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
    });
  });

  it('should reset loginAttempts on successful login', () => {
    authServiceSpy.login.mockReturnValue(of({} as any));
    component.loginAttempts = 3;

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'Password123',
    });

    component.onSubmit();

    expect(component.loginAttempts).toBe(0);
    expect(component.lockoutUntil).toBeNull();
    expect(component.isLoading).toBe(false);
  });

  // ─── FAILED LOGIN ATTEMPTS ──────────────────────────────────────

  it('should increment loginAttempts on failed login', async () => {
    authServiceSpy.login.mockReturnValue(
      throwError(() => ({
        error: { errors: { email: ['invalid credentials.'] } },
      })),
    );

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'wrong',
    });

    component.onSubmit();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.loginAttempts).toBe(1);
    expect(component.errorMessage).toBe('invalid credentials.');
    expect(component.isLoading).toBe(false);
  });

  it('should set error message from error.errors on failure', async () => {
    authServiceSpy.login.mockReturnValue(
      throwError(() => ({
        error: { errors: { email: ['invalid credentials.'] } },
      })),
    );

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'wrong',
    });

    component.onSubmit();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.errorMessage).toBe('invalid credentials.');
  });

  it('should set error message from error.message on failure', async () => {
    authServiceSpy.login.mockReturnValue(
      throwError(() => ({
        error: { message: 'Account suspended' },
      })),
    );

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'Password123',
    });

    component.onSubmit();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.errorMessage).toBe('Account suspended');
  });

  it('should set default error message when no error details', async () => {
    authServiceSpy.login.mockReturnValue( throwError(() => ({ error: {} })) );

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'Password123',
    });

    component.onSubmit();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.errorMessage).toBe('Login failed. Please check your credentials.');
  });

  // ─── LOCKOUT BEHAVIOR ───────────────────────────────────────────

  it('should lock out after 5 failed attempts', async () => {
    authServiceSpy.login.mockReturnValue(
      throwError(() => ({
        error: { errors: { email: ['invalid credentials.'] } },
      })),
    );

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'wrong',
    });

    for (let i = 0; i < 5; i++) {
      component.onSubmit();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(component.loginAttempts).toBe(5);
    expect(component.isLockedOut).toBe(true);
    expect(component.lockoutUntil).toBeGreaterThan(Date.now());
  });

  it('should not submit when locked out', async () => {
    authServiceSpy.login.mockReturnValue(
      throwError(() => ({
        error: { errors: { email: ['invalid credentials.'] } },
      })),
    );

    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'wrong',
    });

    // Trigger lockout
    for (let i = 0; i < 5; i++) {
      component.onSubmit();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Reset mock call count
    authServiceSpy.login.mockClear();

    // Attempt to submit while locked out
    component.loginForm.patchValue({ password: 'Password123' });
    component.onSubmit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should calculate lockoutSecondsRemaining', () => {
    component.lockoutUntil = Date.now() + 30_000;
    expect(component.lockoutSecondsRemaining).toBeGreaterThan(25);
    expect(component.lockoutSecondsRemaining).toBeLessThanOrEqual(30);
  });

  it('should return 0 for lockoutSecondsRemaining when not locked out', () => {
    expect(component.lockoutSecondsRemaining).toBe(0);
  });

  it('should clear lockout after timeout expires', async () => {
    component.lockoutUntil = Date.now() + 100;
    component['startLockoutTimer']();

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(component.isLockedOut).toBe(false);
  });

  // ─── CLEAR ERROR ────────────────────────────────────────────────

  it('should clear error message with clearError', () => {
    component.errorMessage = 'Some error';
    component.clearError();
    expect(component.errorMessage).toBe('');
  });

  it('should not trigger change detection if no error to clear', () => {
    component.errorMessage = '';
    const cdrSpy = vi.spyOn(component['cdr'], 'detectChanges');
    component.clearError();
    expect(cdrSpy).not.toHaveBeenCalled();
  });

  // ─── TOGGLE PASSWORD VISIBILITY ─────────────────────────────────

  it('should toggle showPassword', () => {
    expect(component.showPassword).toBe(false);
    component.showPassword = true;
    expect(component.showPassword).toBe(true);
  });
});
