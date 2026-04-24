import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

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
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper title="Edit chapter" (close)="dialogRef.close()">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-bold text-content">Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="Chapter Name"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted dark:text-content transition-all"
            autofocus
            (keyup.enter)="onSave()"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-content">Orientation</label>
          <select
            [(ngModel)]="orientation"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none dark:text-content transition-all"
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
      </div>

      <button actions
        appButton
        variant="ghost"
        class="!text-rose-500 hover:!bg-rose-500/10"
        (click)="onDelete()"
        [disabled]="data.isLastChapter"
      >
        Delete Chapter
      </button>
      <div actions class="flex-1"></div>
      <button actions appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
      <button actions appButton variant="primary" (click)="onSave()" [disabled]="!name.trim() || (name === data.currentName && orientation === data.currentOrientation)">
        Save Changes
      </button>
    </app-dialog-wrapper>
  `,
})
export class EditChapterDialogComponent {
  dialogRef = inject(DialogRef<EditChapterDialogResult>);
  data = inject<EditChapterDialogData>(DIALOG_DATA);
  
  name = this.data.currentName;
  orientation = this.data.currentOrientation;

  onSave() {
    if (!this.name.trim()) return;
    this.dialogRef.close({
      action: 'save',
      name: this.name.trim(),
      orientation: this.orientation
    });
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }
}
