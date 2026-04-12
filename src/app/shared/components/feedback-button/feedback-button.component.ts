import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FeedbackService, FeedbackType } from '../../../core/services/feedback.service';
import { ButtonComponent } from '../button/button.component';

interface FeedbackForm {
  name: string;
  email: string;
  type: FeedbackType;
  message: string;
}

@Component({
  selector: 'app-feedback-button',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './feedback-button.component.html',
})
export class FeedbackButtonComponent {
  private feedbackService = inject(FeedbackService);
  private router = inject(Router);

  isOpen = signal(false);
  isSubmitting = signal(false);
  isSubmitted = signal(false);

  showButton = computed(() => {
    const url = this.router.url;
    return url === '/' || url === '' || url === '/home';
  });

  form: FeedbackForm = {
    name: '',
    email: '',
    type: 'general',
    message: '',
  };

  feedbackTypes: { value: FeedbackType; label: string }[] = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'general', label: 'General Feedback' },
  ];

  openModal() {
    this.isOpen.set(true);
  }

  closeModal() {
    this.isOpen.set(false);
    if (this.isSubmitted()) {
      this.resetForm();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('feedback-backdrop')) {
      this.closeModal();
    }
  }

  resetForm() {
    this.form = {
      name: '',
      email: '',
      type: 'general',
      message: '',
    };
    this.isSubmitted.set(false);
  }

  async onSubmit() {
    if (!this.form.message.trim()) return;

    this.isSubmitting.set(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.feedbackService.addFeedback({
        name: this.form.name,
        email: this.form.email,
        type: this.form.type,
        message: this.form.message,
      });
      this.isSubmitted.set(true);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
