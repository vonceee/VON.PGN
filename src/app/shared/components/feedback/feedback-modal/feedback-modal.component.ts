import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '@shared/ui';
import { FeedbackService, FeedbackType } from '../../../../core/services/feedback.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroCheckCircle } from '@ng-icons/heroicons/outline';

interface FeedbackForm {
  name: string;
  email: string;
  type: FeedbackType;
  message: string;
}

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, NgIcon],
  providers: [provideIcons({ heroXMark, heroCheckCircle })],
  template: `
    <div
      class="premium-card w-full max-w-2xl rounded-xl bg-white dark:bg-black p-8 font-sans shadow-2xl relative"
    >
      <button
        (click)="dialogRef.close()"
        class="absolute top-6 right-6 cursor-pointer p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex items-center justify-center border-none bg-transparent"
      >
        <ng-icon name="heroXMark" class="text-xl"></ng-icon>
      </button>

      @if (!isSubmitted()) {
        <div class="space-y-8 animate-in fade-in duration-300">
          <div>
            <h2 class="text-2xl font-semibold mb-2">Send feedback</h2>
          </div>

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Name -->
              <div class="space-y-2">
                <label for="feedback-name" class="text-sm font-bold opacity-70">Name</label>
                <input
                  id="feedback-name"
                  type="text"
                  [(ngModel)]="form.name"
                  name="name"
                  placeholder="Your name (optional)"
                  class="w-full px-4 py-3 bg-transparent border border-border-theme rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              <!-- Email -->
              <div class="space-y-2">
                <label for="feedback-email" class="text-sm font-bold opacity-70">Email</label>
                <input
                  id="feedback-email"
                  type="email"
                  [(ngModel)]="form.email"
                  name="email"
                  placeholder="your@email.com (optional)"
                  class="w-full px-4 py-3 bg-transparent border border-border-theme rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <!-- Feedback Type -->
            <div class="space-y-2">
              <label for="feedback-type" class="text-sm font-bold opacity-70">Feedback Type</label>
              <select
                id="feedback-type"
                [(ngModel)]="form.type"
                name="type"
                class="w-full px-4 py-3 bg-transparent border border-border-theme rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
              >
                @for (ft of feedbackTypes; track ft.value) {
                  <option [value]="ft.value" class="dark:bg-black">{{ ft.label }}</option>
                }
              </select>
            </div>

            <!-- Message -->
            <div class="space-y-2">
              <label for="feedback-message" class="text-sm font-bold opacity-70">
                Message <span class="text-red-500">*</span>
              </label>
              <textarea
                id="feedback-message"
                [(ngModel)]="form.message"
                name="message"
                rows="5"
                placeholder="Describe your feedback, bug, or suggestion..."
                required
                class="w-full px-4 py-3 bg-transparent border border-border-theme rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-all resize-none"
              ></textarea>
            </div>

            <div class="pt-4">
              <button
                appButton
                variant="primary"
                type="submit"
                [disabled]="!form.message.trim() || isSubmitting()"
                class="w-full h-12 text-sm font-bold"
              >
                {{ isSubmitting() ? 'Sending...' : 'Submit Feedback' }}
              </button>
            </div>
          </form>
        </div>
      } @else {
        <!-- Success State -->
        <div
          class="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500"
        >
          <div class="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <ng-icon name="heroCheckCircle" class="text-4xl text-cyan-500"></ng-icon>
          </div>
          <div>
            <h2 class="text-2xl font-semibold mb-2">Thank you!</h2>
            <p class="text-sm opacity-60 max-w-xs mx-auto">
              Your feedback has been received. We appreciate you taking the time to help us improve.
            </p>
          </div>
          <button appButton variant="outline" (click)="dialogRef.close()" class="px-12 h-11">
            Close
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      textarea:focus,
      input:focus,
      select:focus {
        background: rgba(var(--color-cyan-500), 0.03);
      }
    `,
  ],
})
export class FeedbackModalComponent {
  dialogRef = inject(DialogRef<void>);
  private feedbackService = inject(FeedbackService);

  isSubmitting = signal(false);
  isSubmitted = signal(false);

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

  async onSubmit() {
    if (!this.form.message.trim()) return;

    this.isSubmitting.set(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
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
