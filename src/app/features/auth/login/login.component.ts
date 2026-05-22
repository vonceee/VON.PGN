import { Component, inject, DestroyRef, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TypewriterTextComponent  } from '@shared/ui';
import { BackLinkComponent  } from '@shared/ui';
import { ButtonComponent  } from '@shared/ui';
import { AuthBrandingComponent } from '../components/auth-branding/auth-branding';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BackLinkComponent, ButtonComponent, AuthBrandingComponent],
  templateUrl: './login.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private lockoutTimer: ReturnType<typeof setInterval> | null = null;

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  loginAttempts = signal(0);
  lockoutUntil = signal<number | null>(null);
  private currentTime = signal(Date.now());


  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  isLockedOut = computed(() => {
    const until = this.lockoutUntil();
    const now = this.currentTime();
    if (!until) return false;
    return now < until;
  });

  lockoutSecondsRemaining = computed(() => {
    const until = this.lockoutUntil();
    const now = this.currentTime();
    if (!until) return 0;
    return Math.max(0, Math.ceil((until - now) / 1000));
  });

  private startLockoutTimer() {
    if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    this.currentTime.set(Date.now());
    this.lockoutTimer = setInterval(() => {
      this.currentTime.set(Date.now());
      const until = this.lockoutUntil();
      if (until && this.currentTime() >= until) {
        this.clearLockout();
      }
    }, 1000);
  }

  private clearLockout() {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = null;
    }
    this.lockoutUntil.set(null);
    this.loginAttempts.set(0);
    this.errorMessage.set('');
  }


  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    });
  }

  clearError() {
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }
  }


  onSubmit() {
    if (this.loginForm.invalid || this.isLockedOut()) return;

    const { email, password } = this.loginForm.value;

    if (!email || !password || email.trim() === '' || password.trim() === '') {
      this.errorMessage.set('Please enter both email and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.loginAttempts.set(0);
        this.lockoutUntil.set(null);
      },
      error: (err) => {
        this.loginAttempts.update(v => v + 1);

        if (this.loginAttempts() >= MAX_LOGIN_ATTEMPTS) {
          this.lockoutUntil.set(Date.now() + LOCKOUT_DURATION_MS);
          this.startLockoutTimer();
        } else {
          let msg = 'Login failed. Please check your credentials.';
          if (err.error?.errors) {
            const firstKey = Object.keys(err.error.errors)[0];
            msg = err.error.errors[firstKey][0];
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          this.errorMessage.set(msg);
        }

        this.isLoading.set(false);
      },
    });
  }

}

