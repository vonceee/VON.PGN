import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
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

  private lastCredentials: LoginCredentials | null = null;

  initAuth() {
    if (!this.getToken()) {
      return of(null);
    }
    return this.userService.loadMyProfile().pipe(
      tap((res) => {
        this.currentUser.set(res.data);
      }),
      catchError(() => {
        this.clearAuthWithoutRedirect();
        return of(null);
      })
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
    if (response.user && !response.user.email_verified_at) {
      // Keep the token so we can re-check verification status,
      // but don't set currentUser — this blocks auth-guarded routes.
      localStorage.setItem(this.tokenKey, response.access_token);
      this.currentUser.set(null);
      this.userService.currentUser.set(null);
      this.router.navigate(['/verify-email']);
      return;
    }

    localStorage.setItem(this.tokenKey, response.access_token);
    this.currentUser.set(response.user);
    this.userService.currentUser.set(response.user);
    this.router.navigate(['/profile']);
  }

  private clearAuth() {
    this.clearAuthWithoutRedirect();
    this.router.navigate(['/login']);
  }

  private clearAuthWithoutRedirect() {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.userService.currentUser.set(null);
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
}
