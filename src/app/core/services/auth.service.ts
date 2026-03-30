import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, map, of, finalize } from 'rxjs';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: any;
}

interface LoginCredentials {
  email?: string | null;
  password?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private userService = inject(UserService);

  private apiUrl = environment.apiUrl;
  private tokenKey = 'chess_auth_token';

  currentUser = signal<any | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  unverifiedEmail = signal<string | null>(null);

  /** false while the initial token->profile restore is in-flight */
  isInitialized = signal(false);

  private lastCredentials: LoginCredentials | null = null;

  initAuth() {
    const token = this.getToken();

    if (!token) {
      this.isInitialized.set(true);
      return of(null);
    }

    // Restore cached profile immediately so the user appears logged in
    // while the API refresh happens in the background.
    const cached = this.userService.getCachedProfile();
    if (cached) {
      this.currentUser.set(cached);
      this.userService.currentUser.set(cached);
    }

    return this.userService.loadMyProfile().pipe(
      tap({
        next: (res) => {
          this.currentUser.set(res.data);
        },
        error: () => {
          // Only clear auth if there was no cached profile to fall back on.
          if (!cached) {
            this.clearAuthWithoutRedirect();
          }
        },
      }),
      catchError(() => {
        if (!cached) {
          this.clearAuthWithoutRedirect();
        }
        return of(null);
      }),
      finalize(() => {
        this.isInitialized.set(true);
      }),
    );
  }

  register(data: any) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  login(credentials: any) {
    this.lastCredentials = credentials;
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  logout() {
    this.http
      .post(
        `${this.apiUrl}/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        },
      )
      .subscribe({
        next: () => this.clearAuth(),
        error: () => this.clearAuth(),
      });
  }

  private handleAuthentication(response: AuthResponse) {
    localStorage.setItem(this.tokenKey, response.access_token);

    if (response.user && !response.user.email_verified_at) {
      this.unverifiedEmail.set(response.user.email);
      this.currentUser.set(null);
      this.userService.currentUser.set(null);
      this.userService.clearCachedProfile();
      this.router.navigate(['/verify-email']);
      return;
    }

    this.currentUser.set(response.user);
    this.userService.currentUser.set(response.user);
    this.userService.cacheProfile(response.user);
    this.router.navigate(['/profile']);
  }

  private clearAuth() {
    this.clearAuthWithoutRedirect();
    this.router.navigate(['/login']);
  }

  private clearAuthWithoutRedirect() {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.unverifiedEmail.set(null);
    this.userService.currentUser.set(null);
    this.userService.clearCachedProfile();
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  retryLogin() {
    if (!this.lastCredentials) {
      this.router.navigate(['/login']);
      return of(null as any);
    }
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, this.lastCredentials)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  resendVerificationEmail() {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/email/verification-notification`,
      {},
      {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      }
    );
  }

  updateEmail(email: string) {
    return this.http.put<{ message: string, user: any }>(
      `${this.apiUrl}/email/update`,
      { email },
      {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      }
    ).pipe(
      tap(response => {
        if (response.user && response.user.email) {
          this.unverifiedEmail.set(response.user.email);
        }
      })
    );
  }

  sendPasswordResetLink(email: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: any) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, data);
  }
}
