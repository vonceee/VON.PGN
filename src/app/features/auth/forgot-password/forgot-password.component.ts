import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.forgotPasswordForm.invalid) return;

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.sendPasswordResetLink(this.forgotPasswordForm.value.email!).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'If an account matches, a reset link was sent.';
        this.isLoading = false;
        this.forgotPasswordForm.reset();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.error?.errors?.email?.[0] || 'Unable to process request.';
        this.isLoading = false;
      },
    });
  }
}
