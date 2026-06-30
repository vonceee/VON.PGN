import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
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
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="bg-main rounded-4xl w-full p-8 space-y-8 relative mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-sans">Edit chapter</h2>
      </div>

      <!-- Body Content -->
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Chapter Name -->
          <div class="flex flex-col gap-2">
            <label for="chapter_name" class="font-medium">Chapter name</label>
            <input
              type="text"
              id="chapter_name"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
              placeholder="Chapter Name"
              class="w-full px-3 py-2.5 rounded-xl text-sm border border-border-base bg-main outline-none placeholder:text-muted/50"
              autofocus
              (keyup.enter)="onSave()"
            />
          </div>

          <!-- Orientation -->
          <div class="flex flex-col gap-2">
            <label for="orientation" class="font-medium">Orientation</label>
            <div class="relative w-full">
              <select
                id="orientation"
                [value]="orientation()"
                (change)="orientation.set($any($event.target).value)"
                class="w-full px-3 py-2.5 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none"
                style="
                  background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
                  background-position: right 0.5rem center;
                  background-size: 1.25rem;
                "
              >
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 w-full">
        @if (!data.isLastChapter) {
          <button
            appButton
            variant="ghost"
            class="flex-1 !text-rose-500 hover:!bg-rose-500/10 whitespace-nowrap"
            (click)="onDelete()"
          >
            Delete chapter
          </button>
        }
        <button appButton variant="outline" (click)="dialogRef.close()" class="flex-1 whitespace-nowrap">
          Cancel
        </button>
        <button appButton variant="primary" (click)="onSave()" [disabled]="!name().trim()" class="flex-1 whitespace-nowrap">
          Save changes
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
export class EditChapterDialogComponent {
  dialogRef = inject(DialogRef<EditChapterDialogResult>);
  data = inject<EditChapterDialogData>(DIALOG_DATA);

  name = signal(this.data.currentName);
  orientation = signal<'white' | 'black'>(this.data.currentOrientation);

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
