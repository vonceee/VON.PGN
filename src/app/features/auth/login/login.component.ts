import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div>
      <h2>Login</h2>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div>
          <label>Email:</label><br />
          <input type="email" formControlName="email" />
        </div>

        <div>
          <label>Password:</label><br />
          <input type="password" formControlName="password" />
        </div>

        @if (errorMessage) {
          <div style="color: red;">{{ errorMessage }}</div>
        }

        <button type="submit" [disabled]="loginForm.invalid || isLoading">
          {{ isLoading ? 'Logging in...' : 'Submit' }}
        </button>
      </form>

      <p>Don't have an account? <a routerLink="/register">Register here</a></p>
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
