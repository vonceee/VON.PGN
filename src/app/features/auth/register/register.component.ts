import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div>
      <h2>Create Account</h2>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <div>
          <label>Username:</label><br />
          <input type="text" formControlName="username" />
        </div>

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

        <button type="submit" [disabled]="registerForm.invalid || isLoading">
          {{ isLoading ? 'Creating account...' : 'Register' }}
        </button>
      </form>

      <p>Already have an account? <a routerLink="/login">Login here</a></p>
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
