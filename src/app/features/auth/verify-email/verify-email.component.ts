import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmailComponent {
  private authService = inject(AuthService);

  isChecking = false;
  isResending = false;
  resendMessage = '';

  checkVerification() {
    this.isChecking = true;
    this.authService.retryLogin().subscribe({
      next: () => {
        this.isChecking = false;
      },
      error: () => {
        this.isChecking = false;
      },
    });
  }

  resendEmail() {
    this.isResending = true;
    this.resendMessage = '';
    this.authService.resendVerificationEmail().subscribe({
      next: (res) => {
        this.resendMessage = res.message || 'Verification email sent!';
        this.isResending = false;
      },
      error: () => {
        this.resendMessage = 'Failed to send email. Please try again.';
        this.isResending = false;
      },
    });
  }
}
