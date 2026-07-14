import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

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

@Component({
  selector: 'app-edit-chapter-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  onSave() {
    if (!this.name().trim()) return;
    this.dialogRef.close({
      action: 'save',
      name: this.name().trim(),
      orientation: this.orientation()
    });
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }
}
