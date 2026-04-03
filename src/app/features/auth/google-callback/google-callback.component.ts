import { Component, inject, OnInit, afterNextRender, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `
    <div class="h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div class="text-center">
        @if (error) {
          <div class="p-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg max-w-sm">
            {{ error }}
          </div>
          <p class="mt-4 text-sm text-zinc-500">
            Redirecting to login...
          </p>
        } @else {
          <svg
            class="animate-spin h-8 w-8 text-cyan-400 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p class="mt-4 text-sm text-zinc-500">Signing in with Google...</p>
        }
      </div>
    </div>
  `,
})
export class GoogleCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  error: string | null = null;

  constructor() {
    // Only use afterNextRender in browser context - not during SSR
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        const pendingToken = this.authService.pendingGoogleToken();
        if (pendingToken) {
          try {
            localStorage.setItem('chess_auth_token', pendingToken);
            // Clear the pending token once stored in localStorage
            this.authService.pendingGoogleToken.set(null);
          } catch (e) {
            // localStorage not available
          }
        }
      });
    }
  }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const errorParam = this.route.snapshot.queryParamMap.get('error');

    if (errorParam) {
      switch (errorParam) {
        case 'google_auth_failed':
          this.error = 'Google authentication failed. Please try again.';
          break;
        case 'email_already_linked':
          this.error = 'This email is already linked to another Google account.';
          break;
        default:
          this.error = 'Authentication failed. Please try again.';
      }
      setTimeout(() => this.router.navigate(['/login']), 3000);
      return;
    }

    if (!token) {
      this.error = 'No authentication token received.';
      setTimeout(() => this.router.navigate(['/login']), 3000);
      return;
    }

    // Make API call directly with the token - bypasses interceptor timing issues
    this.http.get<any>(`${environment.apiUrl}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        // Store token via AuthService signal (available immediately, works during SSR)
        // This is used by the auth interceptor until afterNextRender saves to localStorage
        this.authService.pendingGoogleToken.set(token);
        
        // Update AuthService state directly so app knows user is logged in
        this.authService.currentUser.set(res.data);
        this.authService.isInitialized.set(true);
        
        // Also update UserService
        this.userService.currentUser.set(res.data);
        this.userService.cacheProfile(res.data);
        
        this.router.navigate(['/profile']);
      },
      error: () => {
        this.error = 'Failed to complete sign-in. Please try again.';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
    });
  }
}
