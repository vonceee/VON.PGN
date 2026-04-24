import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

export interface EditChapterDialogResult {
  action: 'save' | 'delete';
  name?: string;
}

export interface EditChapterDialogData {
  currentName: string;
  isLastChapter: boolean;
}

@Component({
  selector: 'app-edit-chapter-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper title="Edit Chapter" (close)="dialogRef.close()">
      <div class="space-y-6">
        <div class="space-y-2">
          <label class="text-sm font-bold text-content">Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="Chapter Name"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-lg text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted dark:text-content transition-all"
            autofocus
            (keyup.enter)="onSave()"
          />
        </div>

        <div class="pt-4">
          <button
            appButton
            variant="danger"
            (click)="onDelete()"
            [disabled]="data.isLastChapter"
          >
            Delete Chapter
          </button>
          @if (data.isLastChapter) {
            <p class="mt-2 text-[10px] text-muted italic text-center">Cannot delete the last chapter of a study.</p>
          }
        </div>
      </div>

      <div actions>
        <button appButton variant="primary" (click)="onSave()" [disabled]="!name().trim() || name() === data.currentName">
          Save Changes
        </button>
      </div>
    </app-dialog-wrapper>
  `,
})
export class EditChapterDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<EditChapterDialogResult>);
  data = inject<EditChapterDialogData>(DIALOG_DATA);
  
  name = signal('');

  ngOnInit() {
    this.name.set(this.data.currentName);
  }

  onSave() {
    if (this.name().trim() && this.name() !== this.data.currentName) {
      this.dialogRef.close({ action: 'save', name: this.name().trim() });
    }
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }
}
