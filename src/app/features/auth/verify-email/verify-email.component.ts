import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmailComponent {
  private authService = inject(AuthService);

  unverifiedEmail = this.authService.unverifiedEmail;

  isChecking = false;
  isResending = false;
  resendMessage = '';

  isEditingEmail = false;
  newEmailInput = '';
  isUpdatingEmail = false;
  updateEmailMessage = '';

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
    this.updateEmailMessage = '';
    this.authService.resendVerificationEmail().subscribe({
      next: (res) => {
        this.resendMessage = res.message || 'Verification email sent!';
        this.isResending = false;
      },
      error: (err) => {
        this.resendMessage = err.error?.message || 'Failed to send email. Please try again.';
        this.isResending = false;
      },
    });
  }

  startEditEmail() {
    this.isEditingEmail = true;
    this.newEmailInput = this.unverifiedEmail() || '';
    this.updateEmailMessage = '';
    this.resendMessage = '';
  }

  cancelEditEmail() {
    this.isEditingEmail = false;
    this.updateEmailMessage = '';
  }

  updateEmail() {
    if (!this.newEmailInput || this.newEmailInput === this.unverifiedEmail()) {
      this.isEditingEmail = false;
      return;
    }

    this.isUpdatingEmail = true;
    this.updateEmailMessage = '';
    this.resendMessage = '';

    this.authService.updateEmail(this.newEmailInput).subscribe({
      next: (res) => {
        this.isUpdatingEmail = false;
        this.isEditingEmail = false;
        this.resendMessage = res.message || 'Email updated and new verification link sent!';
      },
      error: (err) => {
        this.isUpdatingEmail = false;
        this.updateEmailMessage = err.error?.message || err.error?.errors?.email?.[0] || 'Failed to update email.';
      }
    });
  }
}
