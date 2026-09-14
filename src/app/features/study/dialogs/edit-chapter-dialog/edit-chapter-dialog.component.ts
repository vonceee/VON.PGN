import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { TextInputComponent, SelectComponent, SelectItem } from '@shared/ui';

export interface EditChapterDialogResult {
  action: 'save' | 'delete';
  name?: string;
  orientation?: 'white' | 'black';
}

export interface EditChapterDialogData {
  currentName: string;
  currentOrientation: 'white' | 'black';
  isLastChapter: boolean;
}

/**
 * Dialog for editing or deleting a study chapter.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Standardizes form controls with shared UI components (TextInputComponent, SelectComponent)
 * to guarantee unified floating label styling, accessible overlays, and consistent validation states.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Chapter name cannot be empty when saving.
 * - Deletion requires exact matching confirmation text of current chapter name.
 * - Single/last chapter cannot be deleted (data.isLastChapter flag hides delete section).
 */
@Component({
  selector: 'app-edit-chapter-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TextInputComponent, SelectComponent],
  templateUrl: './edit-chapter-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EditChapterDialogComponent {
  dialogRef = inject(DialogRef<EditChapterDialogResult>);
  data = inject<EditChapterDialogData>(DIALOG_DATA);

  name = signal(this.data.currentName);
  orientation = signal<'white' | 'black'>(this.data.currentOrientation);
  isConfirmingDelete = signal(false);
  deleteConfirmText = signal('');

  readonly orientationOptions: SelectItem<'white' | 'black'>[] = [
    { label: 'White', value: 'white' },
    { label: 'Black', value: 'black' },
  ];

  onSave() {
    if (!this.name().trim()) return;
    this.dialogRef.close({
      action: 'save',
      name: this.name().trim(),
      orientation: this.orientation()
    });
  }

  cancelDelete() {
    this.isConfirmingDelete.set(false);
    this.deleteConfirmText.set('');
  }

  onDelete() {
    if (this.deleteConfirmText() !== this.data.currentName) return;
    this.dialogRef.close({ action: 'delete' });
  }
}
