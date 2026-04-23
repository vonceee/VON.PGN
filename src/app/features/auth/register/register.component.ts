import { Component, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SectionHeadingComponent, TypewriterTextComponent, BackLinkComponent, ButtonComponent } from '@shared/ui';


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
  imports: [ReactiveFormsModule, RouterLink, SectionHeadingComponent, TypewriterTextComponent, BackLinkComponent, ButtonComponent],
  templateUrl: './register.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  isLoading = signal(false);
  errorMessage = signal('');
  emailError = signal('');
  usernameError = signal('');
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

  // Track password value for strength calculation using a signal
  private passwordValue = toSignal(
    this.registerForm.get('password')!.valueChanges.pipe(map(v => v || '')),
    { initialValue: '' }
  );

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


  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.emailError.set('');
    this.usernameError.set('');

    const formValue = this.registerForm.value;

    this.authService.register({
      username: (formValue.username || '').trim(),
      email: (formValue.email || '').trim(),
      password: formValue.password || '',
      password_confirmation: formValue.password_confirmation || '',
    })
    .pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed()
    )
    .subscribe({
      next: () => {
        // Success logic here (e.g., redirect)
      },
      error: (err) => {
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
          
          if (!errors.email && !errors.username) {
            this.errorMessage.set(err.error?.message || 'Registration failed. Please check your information.');
          }
        } else {
          this.errorMessage.set(err.error?.message || 'An unexpected error occurred. Please try again.');
        }
      },
    });
  }

}

