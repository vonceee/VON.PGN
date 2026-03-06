import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

// 1. Define the exact shapes of our data so TypeScript can protect us
export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: any; // We can type this strictly to your User model later!
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // The base URL matching your Laravel local server
  private apiUrl = 'http://127.0.0.1:8000/api';
  private tokenKey = 'chess_auth_token';

  // 2. The core state Signals
  // We initialize by checking if a token already exists in LocalStorage
  currentUser = signal<any | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null || !!this.getToken());

  constructor() {
    // Optional: If you want to fetch the user profile immediately on app load if a token exists
    // this.checkInitialAuth();
  }

  // ==========================================
  // AUTHENTICATION METHODS
  // ==========================================

  register(data: any) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  login(credentials: any) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  logout() {
    // 1. Tell Laravel to destroy the token on the backend
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
        error: () => this.clearAuth(), // Even if Laravel fails, force logout locally
      });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private handleAuthentication(response: AuthResponse) {
    // 1. Save the VIP pass to the browser
    localStorage.setItem(this.tokenKey, response.access_token);

    // 2. Update our reactive state
    this.currentUser.set(response.user);

    // 3. Send them to the profile page!
    this.router.navigate(['/profile']);
  }

  private clearAuth() {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
