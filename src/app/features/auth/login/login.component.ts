import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
      <div
        class="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-8 sm:p-10 transition-colors"
      >
        <div class="mb-8 text-center">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Welcome back
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Please enter your details to sign in.
          </p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="email"
              >Email</label
            >
            <input
              id="email"
              type="email"
              formControlName="email"
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="name@example.com"
            />
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                for="password"
                >Password</label
              >
              <a
                href="#"
                class="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >Forgot password?</a
              >
            </div>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="••••••••"
            />
          </div>

          @if (errorMessage) {
            <div
              class="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20"
            >
              {{ errorMessage }}
            </div>
          }

          <button
            type="submit"
            [disabled]="loginForm.invalid || isLoading"
            class="w-full py-2.5 px-4 mt-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center active:scale-[0.98]"
          >
            @if (isLoading) {
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                xmlns="http://www.w3.org/2000/svg"
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
              Logging in...
            } @else {
              Sign In
            }
          </button>
        </form>

        <p class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?
          <a
            routerLink="/register"
            class="font-medium text-black dark:text-white hover:underline underline-offset-4 decoration-1 transition-all"
            >Sign up</a
          >
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        // Success! The AuthService handles saving the token and routing.
        this.isLoading = false;
      },
      error: (err) => {
        // Display the error from Laravel
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
        this.isLoading = false;
      },
    });
  }
}
