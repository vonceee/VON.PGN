import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: any; // TODO
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = 'http://127.0.0.1:8000/api';
  private tokenKey = 'chess_auth_token';

  currentUser = signal<any | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null || !!this.getToken());

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
    this.currentUser.set(response.user);
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
