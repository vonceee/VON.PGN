import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { ButtonComponent  } from '@shared/ui';
import { AcademyService } from '../../../../core/services/academy.service';
import { ToastService } from '../../../../core/services/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-academy-enrollment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIcon, ButtonComponent],
  providers: [provideIcons({ heroXMark })],
  templateUrl: './enrollment-modal.html',
  styles: [`
    :host {
      display: block;
    }
  `],
  animations: [
    trigger('backdropPath', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('modalContainer', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' })),
      ]),
    ]),
  ]
})
export class AcademyEnrollmentModalComponent {
  private fb = inject(FormBuilder);
  private academyService = inject(AcademyService);
  private toastService = inject(ToastService);

  @Output() close = new EventEmitter<void>();

  enrollmentForm = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    contact_number: ['', [Validators.required]],
    chess_level: ['Beginner', [Validators.required]],
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

    // Filter payload to only include fields the backend expects
    const { agreed_to_policy, ...payload } = this.enrollmentForm.value;

    this.academyService.enroll(payload).subscribe({
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

