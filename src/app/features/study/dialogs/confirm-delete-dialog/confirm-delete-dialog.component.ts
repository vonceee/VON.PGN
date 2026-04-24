import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

export interface ConfirmDeleteDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper [title]="data.title || 'Confirm Deletion'" (close)="dialogRef.close(false)">
      <div class="space-y-4">
        <p class="text-muted">
          {{ data.message || 'Are you sure you want to delete this item? This action cannot be undone.' }}
        </p>
      </div>

      <div actions>
        <button appButton variant="ghost" (click)="dialogRef.close(false)">Cancel</button>
        <button appButton variant="primary" class="!bg-rose-600 !hover:bg-rose-700 !border-rose-600/20 text-white" (click)="dialogRef.close(true)">
          {{ data.confirmText || 'Delete' }}
        </button>
      </div>
    </app-dialog-wrapper>
  `,
})
export class ConfirmDeleteDialogComponent {
  dialogRef = inject(DialogRef<boolean>);
  data = inject<ConfirmDeleteDialogData>(DIALOG_DATA);
}
