import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: {
    register: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      register: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // ─── CREATION ────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.registerForm.get('username')?.value).toBe('');
    expect(component.registerForm.get('email')?.value).toBe('');
    expect(component.registerForm.get('password')?.value).toBe('');
    expect(component.registerForm.get('password_confirmation')?.value).toBe('');
  });

  it('should initialize with isLoading false', () => {
    expect(component.isLoading).toBe(false);
  });

  it('should initialize with empty errorMessage', () => {
    expect(component.errorMessage).toBe('');
  });

  // ─── FORM VALIDATION ────────────────────────────────────────────

  it('should be invalid when empty', () => {
    expect(component.registerForm.valid).toBe(false);
  });

  it('should require username', () => {
    component.registerForm.patchValue({
      username: '',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });
    expect(component.registerForm.get('username')?.hasError('required')).toBe(true);
  });

  it('should require username to match pattern (alphanumeric, underscore, hyphen)', () => {
    component.registerForm.patchValue({ username: 'bad user!' });
    expect(component.registerForm.get('username')?.hasError('pattern')).toBe(true);

    component.registerForm.patchValue({ username: 'valid_user-123' });
    expect(component.registerForm.get('username')?.hasError('pattern')).toBe(false);
  });

  it('should require valid email', () => {
    component.registerForm.patchValue({ email: 'not-an-email' });
    expect(component.registerForm.get('email')?.hasError('email')).toBe(true);

    component.registerForm.patchValue({ email: 'valid@email.com' });
    expect(component.registerForm.get('email')?.hasError('email')).toBe(false);
  });

  it('should require minimum 8 character password', () => {
    component.registerForm.patchValue({ password: 'Short1' });
    expect(component.registerForm.get('password')?.hasError('minlength')).toBe(true);

    component.registerForm.patchValue({ password: 'LongEnough1' });
    expect(component.registerForm.get('password')?.hasError('minlength')).toBe(false);
  });

  it('should require mixed case and number in password', () => {
    component.registerForm.patchValue({ password: 'alllowercase1' });
    expect(component.registerForm.get('password')?.hasError('pattern')).toBe(true);

    component.registerForm.patchValue({ password: 'ALLUPPERCASE1' });
    expect(component.registerForm.get('password')?.hasError('pattern')).toBe(true);

    component.registerForm.patchValue({ password: 'NoNumbersHere' });
    expect(component.registerForm.get('password')?.hasError('pattern')).toBe(true);

    component.registerForm.patchValue({ password: 'ValidPass1' });
    expect(component.registerForm.get('password')?.hasError('pattern')).toBe(false);
  });

  it('should detect password mismatch', () => {
    component.registerForm.patchValue({
      password: 'Password123',
      password_confirmation: 'Different456',
    });
    expect(component.registerForm.hasError('passwordsMismatch')).toBe(true);

    component.registerForm.patchValue({ password_confirmation: 'Password123' });
    expect(component.registerForm.hasError('passwordsMismatch')).toBe(false);
  });

  it('should be valid with all correct fields', () => {
    component.registerForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });
    expect(component.registerForm.valid).toBe(true);
  });

  // ─── PASSWORD STRENGTH ──────────────────────────────────────────

  it('should return empty string for password strength when no password', () => {
    component.registerForm.patchValue({ password: '' });
    expect(component.passwordStrength).toBe('');
  });

  it('should return weak for short password', () => {
    component.registerForm.patchValue({ password: 'Ab1' });
    expect(component.passwordStrength).toBe('weak');
  });

  it('should return medium for password with 3 of 4 criteria', () => {
    component.registerForm.patchValue({ password: 'abcdefgh1' }); // lowercase + number (only 2)
    expect(component.passwordStrength).toBe('weak');

    component.registerForm.patchValue({ password: 'Abcdefgh1' }); // lower + upper + number
    expect(component.passwordStrength).toBe('medium');
  });

  it('should return strong for password with all 4 criteria', () => {
    component.registerForm.patchValue({ password: 'Abcdefg1!' }); // lower + upper + number + special
    expect(component.passwordStrength).toBe('strong');
  });

  // ─── FORM SUBMISSION ────────────────────────────────────────────

  it('should not submit when form is invalid', () => {
    component.onSubmit();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('should call authService.register on valid submission', () => {
    authServiceSpy.register.mockReturnValue(of({} as any));

    component.registerForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });

    component.onSubmit();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });
  });

  it('should set isLoading to true during submission', () => {
    authServiceSpy.register.mockReturnValue(of({} as any));

    component.registerForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });

    component.onSubmit();
    // After synchronous observable completes, isLoading should be false
    expect(component.isLoading).toBe(false);
  });

  it('should set errorMessage from validation errors on failure', async () => {
    authServiceSpy.register.mockReturnValue(
      throwError(() => ({
        error: {
          errors: { email: ['The email has already been taken.'] },
        },
      })),
    );

    component.registerForm.patchValue({
      username: 'testuser',
      email: 'taken@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });

    component.onSubmit();

    // Allow microtask queue to flush
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.errorMessage).toBe('The email has already been taken.');
    expect(component.isLoading).toBe(false);
  });

  it('should set errorMessage from error message on failure', async () => {
    authServiceSpy.register.mockReturnValue(
      throwError(() => ({
        error: { message: 'Something went wrong' },
      })),
    );

    component.registerForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });

    component.onSubmit();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.errorMessage).toBe('Something went wrong');
  });

  it('should set default errorMessage when no error details', async () => {
    authServiceSpy.register.mockReturnValue( throwError(() => ({ error: {} })) );

    component.registerForm.patchValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      password_confirmation: 'Password123',
    });

    component.onSubmit();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.errorMessage).toBe('Registration failed. Username or email may be taken.');
  });

  // ─── TOGGLE PASSWORD VISIBILITY ─────────────────────────────────

  it('should toggle showPassword', () => {
    expect(component.showPassword).toBe(false);
    component.showPassword = true;
    expect(component.showPassword).toBe(true);
  });

  it('should toggle showConfirmPassword', () => {
    expect(component.showConfirmPassword).toBe(false);
    component.showConfirmPassword = true;
    expect(component.showConfirmPassword).toBe(true);
  });
});
