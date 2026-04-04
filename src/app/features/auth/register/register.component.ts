import { Component, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const passwordConfirmation = control.get('password_confirmation')?.value;

  if (password && passwordConfirmation && password !== passwordConfirmation) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  isLoading = false;
  errorMessage = '';
  emailError = '';
  usernameError = '';
  showPassword = false;
  showConfirmPassword = false;

  registerForm = this.fb.group(
    {
      username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
        ],
      ],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  get passwordStrength(): string {
    const pwd = this.registerForm.get('password')?.value || '';
    if (!pwd) return '';
    if (pwd.length < 8) return 'weak';

    let score = 0;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;

    if (pwd.length >= 8 && score >= 4) return 'strong';
    if (pwd.length >= 8 && score >= 3) return 'medium';
    return 'weak';
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.emailError = '';
    this.usernameError = '';

    const formValue = this.registerForm.value;

    this.authService.register({
      username: (formValue.username || '').trim(),
      email: (formValue.email || '').trim(),
      password: formValue.password || '',
      password_confirmation: formValue.password_confirmation || '',
    })
    .pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: () => {
        this.zone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isLoading = false;

          if (err.status === 429) {
            this.errorMessage = err.error?.message || 'Too many attempts. Please try again later.';
            this.cdr.detectChanges();
            return;
          }

          const errors = err.error?.errors;

          if (errors && typeof errors === 'object') {
            if (errors.email) {
              this.emailError = Array.isArray(errors.email) ? errors.email[0] : errors.email;
            }
            if (errors.username) {
              this.usernameError = Array.isArray(errors.username) ? errors.username[0] : errors.username;
            }
            
            if (!errors.email && !errors.username) {
              this.errorMessage = err.error?.message || 'Registration failed. Please check your information.';
            }
          } else {
            this.errorMessage = err.error?.message || 'An unexpected error occurred. Please try again.';
          }
          this.cdr.detectChanges();
        });
      },
    });
  }
}
