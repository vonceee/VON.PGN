import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

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

  isLoading = false;
  errorMessage = '';
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
          Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/), // Requires mixed case and number
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

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (err) => {
        let msg = 'Registration failed. Username or email may be taken.';
        if (err.error?.errors) {
          const firstKey = Object.keys(err.error.errors)[0];
          msg = err.error.errors[firstKey][0];
        } else if (err.error?.message) {
          msg = err.error.message;
        }
        this.errorMessage = msg;
        this.isLoading = false;
      },
    });
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}/auth/google/redirect`;
  }
}
