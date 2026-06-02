import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-join-class-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" (click)="cancel.emit()">
      <div
        class="bg-main rounded-4xl w-full max-w-sm mx-4 p-8 space-y-8 relative"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-2xl text-content">
            Join class session
          </h2>
        </div>

        <!-- Body Content -->
        <div class="space-y-6">
          <!-- Feature list -->
          <ul class="space-y-3">
            <li class="flex items-start gap-3">
              <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
              <span class="text-sm text-content/85">Synchronized board: follow every move and annotation live.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
              <span class="text-sm text-content/85">Interactive mode: request board control to demonstrate moves.</span>
            </li>
          </ul>
        </div>

        <!-- Footer Actions -->
        <div class="pt-4 flex gap-4 w-full">
          <button appButton variant="outline" class="flex-1" (click)="cancel.emit()">
            Explore freely
          </button>
          <button appButton variant="primary" class="flex-1" (click)="confirm.emit()">
            Join session
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class JoinClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
