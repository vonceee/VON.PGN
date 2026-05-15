import { Component, inject, signal, computed, effect, linkedSignal } from '@angular/core';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { TypewriterTextComponent, BackLinkComponent, ButtonComponent } from '@shared/ui';


function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const passwordConfirmation = control.get('password_confirmation')?.value;

  if (password && passwordConfirmation && password !== passwordConfirmation) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TypewriterTextComponent, BackLinkComponent, ButtonComponent],
  templateUrl: './register.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form State
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  registerForm = this.fb.group(
    {
      username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
        ],
      ],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  // Derived Signals
  private rawPassword = toSignal(this.registerForm.get('password')!.valueChanges);
  passwordValue = computed(() => this.rawPassword() ?? '');

  passwordStrength = computed(() => {
    const pwd = this.passwordValue();
    if (!pwd) return '';
    if (pwd.length < 8) return 'weak';

    let score = 0;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;

    if (pwd.length >= 8 && score >= 4) return 'strong';
    if (pwd.length >= 8 && score >= 3) return 'medium';
    return 'weak';
  });

  // Resource Management for Registration
  private submissionPayload = signal<any | null>(null);

  registerResource = rxResource({
    params: () => this.submissionPayload(),
    stream: ({ params }) => {
      if (!params) return of(null);
      return this.authService.register(params);
    }
  });

  // Error States (using linkedSignal to reset on form change)
  errorMessage = linkedSignal({
    source: () => this.registerForm.value,
    computation: () => ''
  });

  emailError = linkedSignal({
    source: () => this.registerForm.value,
    computation: () => ''
  });

  usernameError = linkedSignal({
    source: () => this.registerForm.value,
    computation: () => ''
  });

  constructor() {
    // Handle errors and map them to our linkedSignals
    effect(() => {
      const err = this.registerResource.error() as any;
      if (!err) return;

      console.error('Registration error:', err);
      
      if (err.status === 429) {
        this.errorMessage.set(err.error?.message || 'Too many attempts. Please try again later.');
        return;
      }

      const errors = err.error?.errors;
      if (errors && typeof errors === 'object') {
        if (errors.email) {
          this.emailError.set(Array.isArray(errors.email) ? errors.email[0] : errors.email);
        }
        if (errors.username) {
          this.usernameError.set(Array.isArray(errors.username) ? errors.username[0] : errors.username);
        }

        const otherErrors = Object.keys(errors)
          .filter(key => key !== 'email' && key !== 'username')
          .map(key => Array.isArray(errors[key]) ? errors[key][0] : errors[key]);
        
        if (otherErrors.length > 0) {
          this.errorMessage.set(otherErrors[0]);
        } else if (!errors.email && !errors.username) {
          this.errorMessage.set(err.error?.message || 'Registration failed.');
        }
      } else {
        this.errorMessage.set(err.error?.message || 'An unexpected error occurred.');
      }
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    const formValue = this.registerForm.value;
    this.submissionPayload.set({
      username: (formValue.username || '').trim(),
      email: (formValue.email || '').trim(),
      password: formValue.password || '',
      password_confirmation: formValue.password_confirmation || '',
    });
  }
}

