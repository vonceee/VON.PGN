import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  token = '';
  email = '';

  resetPasswordForm = this.fb.group(
    {
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

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
      
      if (!this.token || !this.email) {
        this.errorMessage = 'Invalid password reset link. Missing token or email.';
      }
    });
  }

  get passwordStrength(): string {
    const pwd = this.resetPasswordForm.get('password')?.value || '';
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
    if (this.resetPasswordForm.invalid || !this.token || !this.email) return;

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = {
      token: this.token,
      email: this.email,
      password: this.resetPasswordForm.value.password,
      password_confirmation: this.resetPasswordForm.value.password_confirmation,
    };

    this.authService.resetPassword(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'Password successfully reset!';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.error?.errors?.email?.[0] || 'Unable to reset password.';
        this.isLoading = false;
      },
    });
  }
}
