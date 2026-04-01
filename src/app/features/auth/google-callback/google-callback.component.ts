import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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

  error: string | null = null;

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const errorParam = this.route.snapshot.queryParamMap.get('error');

    if (errorParam) {
      this.error = 'Google authentication failed. Please try again.';
      setTimeout(() => this.router.navigate(['/login']), 3000);
      return;
    }

    if (!token) {
      this.error = 'No authentication token received.';
      setTimeout(() => this.router.navigate(['/login']), 3000);
      return;
    }

    this.authService.handleGoogleCallback(token).subscribe({
      error: () => {
        this.error = 'Failed to complete sign-in. Please try again.';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
    });
  }
}
