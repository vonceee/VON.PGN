import { Component, inject, ChangeDetectorRef, DestroyRef, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SectionHeadingComponent } from 'src/app/shared/components/section-heading/section-heading.component';
import { TypewriterTextComponent } from 'src/app/shared/components/typewriter-text/typewriter-text';
import { BackLinkComponent } from 'src/app/shared/components/back-link/back-link.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SectionHeadingComponent, TypewriterTextComponent, BackLinkComponent, ButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private lockoutTimer: ReturnType<typeof setInterval> | null = null;

  isLoading = signal(false);
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

    const { email, password } = this.loginForm.value;

    // Additional validation to prevent sending empty values
    if (!email || !password || email.trim() === '' || password.trim() === '') {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.isLoading.set(true);
    this.errorMessage = '';

    this.authService.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.isLoading.set(false);
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

        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
    });
  }
}
