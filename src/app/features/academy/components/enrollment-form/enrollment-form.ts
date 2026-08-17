import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AcademyService } from '../../../../core/services/academy.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-academy-enrollment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './enrollment-form.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class AcademyEnrollmentFormComponent {
  private fb = inject(FormBuilder);
  private academyService = inject(AcademyService);
  private toastService = inject(ToastService);

  contactEmail = 'vonchess.official@gmail.com';

  enrollmentForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    contact_number: ['', [Validators.required]],
    chess_level: ['New to chess', [Validators.required]],
    experience: [''],
    agreed_to_policy: [false, Validators.requiredTrue],
  });

  isSubmitting = signal(false);
  isSuccess = signal(false);

  onSubmit() {
    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const { first_name, last_name, agreed_to_policy, ...payload } = this.enrollmentForm.value;

    const finalPayload = {
      ...payload,
      full_name: `${first_name} ${last_name}`.trim(),
    };

    this.academyService.enroll(finalPayload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.show('Failed to submit enrollment. Please try again.', 'error');
        console.error('Enrollment error:', err);
      }
    });
  }
}
