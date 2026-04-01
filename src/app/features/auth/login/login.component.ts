import { Component, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private lockoutTimer: ReturnType<typeof setInterval> | null = null;

  isLoading = false;
  errorMessage = '';
  showPassword = false;
  loginAttempts = 0;
  lockoutUntil: number | null = null;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  get isLockedOut(): boolean {
    if (!this.lockoutUntil) return false;
    if (Date.now() >= this.lockoutUntil) {
      this.clearLockout();
      return false;
    }
    return true;
  }

  get lockoutSecondsRemaining(): number {
    if (!this.lockoutUntil) return 0;
    return Math.ceil((this.lockoutUntil - Date.now()) / 1000);
  }

  private startLockoutTimer() {
    if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    this.lockoutTimer = setInterval(() => {
      if (!this.isLockedOut) {
        this.clearLockout();
        this.cdr.detectChanges();
      } else {
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  private clearLockout() {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = null;
    }
    this.lockoutUntil = null;
    this.loginAttempts = 0;
    this.errorMessage = '';
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    });
  }

  clearError() {
    if (this.errorMessage) {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }
  }

  onSubmit() {
    if (this.loginForm.invalid || this.isLockedOut) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.loginAttempts = 0;
        this.lockoutUntil = null;
      },
      error: (err) => {
        this.loginAttempts++;

        if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
          this.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
          this.startLockoutTimer();
        } else {
          let msg = 'Login failed. Please check your credentials.';
          if (err.error?.errors) {
            const firstKey = Object.keys(err.error.errors)[0];
            msg = err.error.errors[firstKey][0];
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          this.errorMessage = msg;
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}/auth/google/redirect`;
  }
}
