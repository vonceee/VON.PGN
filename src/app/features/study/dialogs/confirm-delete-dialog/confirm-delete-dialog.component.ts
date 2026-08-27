import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

export interface ConfirmDeleteDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-4xl w-full p-8 space-y-8 relative">
      <!-- Header -->
      <div class="pb-4 flex items-center justify-between">
        <h2 class="text-2xl">{{ data.title || 'Confirm Deletion' }}</h2>
      </div>

      <!-- Body Content -->
      <div class="space-y-6 max-w-xl">
        <p class="pl-2">
          {{ data.message || 'Are you sure you want to delete this item? This action cannot be undone.' }}
        </p>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 w-full">
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-border-base font-medium text-[16px] leading-5 cursor-pointer hover:bg-slate-200 transition-all" (click)="dialogRef.close(false)">Cancel</button>
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-50 border border-transparent text-red-700 hover:bg-red-100 hover:text-red-800 transition-colors font-medium text-[16px] leading-5 cursor-pointer" (click)="dialogRef.close(true)">
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
