import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

export interface ConfirmDeleteDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="bg-main rounded-4xl w-full p-8 space-y-8 relative">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl">{{ data.title || 'Confirm Deletion' }}</h2>
      </div>

      <!-- Body Content -->
      <div class="space-y-4">
        <p>
          {{ data.message || 'Are you sure you want to delete this item? This action cannot be undone.' }}
        </p>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 w-full">
        <button appButton variant="outline" class="flex-1" (click)="dialogRef.close(false)">Cancel</button>
        <button appButton variant="primary" class="flex-1 !bg-rose-600 !hover:bg-rose-700 !border-rose-600/20 text-white" (click)="dialogRef.close(true)">
          {{ data.confirmText || 'Delete' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  dialogRef = inject(DialogRef<boolean>);
  data = inject<ConfirmDeleteDialogData>(DIALOG_DATA);
}
