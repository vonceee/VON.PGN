import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
      <div
        class="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-8 sm:p-10 transition-colors"
      >
        <div class="mb-8 text-center">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Create Account
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Sign up to get started.</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="username"
              >Username</label
            >
            <input
              id="username"
              type="text"
              formControlName="username"
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="johndoe"
            />
          </div>

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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="password"
              >Password</label
            >
            <input
              id="password"
              type="password"
              formControlName="password"
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="••••••••"
            />
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Must be at least 8 characters long.
            </p>
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
            [disabled]="registerForm.invalid || isLoading"
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
              Creating account...
            } @else {
              Register
            }
          </button>
        </form>

        <p class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?
          <a
            routerLink="/login"
            class="font-medium text-black dark:text-white hover:underline underline-offset-4 decoration-1 transition-all"
            >Sign in</a
          >
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage = '';

  registerForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || 'Registration failed. Username or email may be taken.';
        this.isLoading = false;
      },
    });
  }
}
