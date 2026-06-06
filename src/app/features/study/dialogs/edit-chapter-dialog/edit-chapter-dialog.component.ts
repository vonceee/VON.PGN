import { Component, inject, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
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
        <h2 class="text-2xl text-content font-sans">Edit chapter</h2>
      </div>

      <!-- Body Content -->
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-semibold ml-1">Name</label>
            <div class="relative group">
              <input
                type="text"
                [ngModel]="name()"
                (ngModelChange)="name.set($event)"
                placeholder="Chapter Name"
                class="w-full px-4 py-2.5 bg-subtle rounded-xl text-sm outline-none placeholder:text-muted/50"
                autofocus
                (keyup.enter)="onSave()"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-semibold ml-1">Orientation</label>
            <div #orientationDropdownContainer class="relative">
              <button
                type="button"
                (click)="isOrientationDropdownOpen.update(v => !v)"
                class="w-full py-2.5 pl-1 pr-1 text-left text-content font-medium cursor-pointer text-sm border-b-2 border-border-base flex items-center justify-between focus:outline-none bg-transparent"
              >
                <span>{{ orientation() === 'white' ? 'White' : 'Black' }}</span>
                <svg
                  class="fill-current h-4 w-4 text-muted transition-transform duration-200"
                  [class.rotate-180]="isOrientationDropdownOpen()"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </button>

              @if (isOrientationDropdownOpen()) {
                <div
                  class="absolute top-full left-0 w-full bg-main border border-border-base rounded-xl py-2 mt-2 z-50 flex flex-col shadow-lg max-h-64 overflow-y-auto"
                >
                  <button
                    type="button"
                    (click)="setOrientation('white')"
                    class="w-full px-4 py-2.5 hover:bg-subtle flex items-center text-left group/item cursor-pointer focus:outline-none"
                  >
                    <span
                      class="text-sm text-content group-hover/item:text-accent font-medium"
                      [class.text-accent]="orientation() === 'white'"
                    >
                      White
                    </span>
                  </button>
                  <button
                    type="button"
                    (click)="setOrientation('black')"
                    class="w-full px-4 py-2.5 hover:bg-subtle flex items-center text-left group/item cursor-pointer focus:outline-none"
                  >
                    <span
                      class="text-sm text-content group-hover/item:text-accent font-medium"
                      [class.text-accent]="orientation() === 'black'"
                    >
                      Black
                    </span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex flex-wrap items-center gap-4 w-full">
        <button
          appButton
          variant="ghost"
          class="!text-rose-500 hover:!bg-rose-500/10 whitespace-nowrap"
          (click)="onDelete()"
          [disabled]="data.isLastChapter"
        >
          Delete Chapter
        </button>
        <div class="flex-grow"></div>
        <div class="flex items-center gap-3">
          <button appButton variant="outline" (click)="dialogRef.close()" class="whitespace-nowrap">
            Cancel
          </button>
          <button appButton variant="primary" (click)="onSave()" [disabled]="!name().trim()" class="whitespace-nowrap">
            Save Changes
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
export class EditChapterDialogComponent {
  @ViewChild('orientationDropdownContainer') dropdownContainer?: ElementRef;
  
  dialogRef = inject(DialogRef<EditChapterDialogResult>);
  data = inject<EditChapterDialogData>(DIALOG_DATA);
  
  name = signal(this.data.currentName);
  orientation = signal<'white' | 'black'>(this.data.currentOrientation);
  isOrientationDropdownOpen = signal(false);

  setOrientation(value: 'white' | 'black') {
    this.orientation.set(value);
    this.isOrientationDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.isOrientationDropdownOpen() &&
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isOrientationDropdownOpen.set(false);
    }
  }

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
