import { Component, output } from '@angular/core';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-start-class-dialog',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" (click)="cancel.emit()">
      <div
        class="bg-main rounded-4xl w-full max-w-md mx-4 border border-border-base"
        (click)="$event.stopPropagation()"
      >
        <div class="p-6">
          <!-- Icon -->
          <div class="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
            </svg>
          </div>

          <h2 class="text-lg font-semibold text-center mb-2">Start class session</h2>
          <p class="text-sm text-muted text-center mb-5">
            Turn this study into a live teaching session.
          </p>

          <!-- Feature list -->
          <ul class="space-y-3 mb-6">
            <li class="flex items-start gap-3">
              <span class="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
              <span class="text-sm text-content/80">Members will join and follow your board in real time.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
              <span class="text-sm text-content/80">You retain full board control.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
              <span class="text-sm text-content/80">Students can request board control to demonstrate a move.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
              <span class="text-sm text-content/80">End the session at any time by clicking the stop button.</span>
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 px-6 pb-6">
          <button appButton variant="ghost" class="flex-1" (click)="cancel.emit()">
            Cancel
          </button>
          <button appButton variant="primary" class="flex-1" (click)="confirm.emit()">
            Start session
          </button>
        </div>
      </div>
    </div>
  `,
})
export class StartClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
