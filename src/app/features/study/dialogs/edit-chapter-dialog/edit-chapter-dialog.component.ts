import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrash } from '@ng-icons/heroicons/outline';

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
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent, NgIconComponent],
  providers: [provideIcons({ heroTrash })],
  template: `
    <app-dialog-wrapper title="Edit Chapter" (close)="dialogRef.close()">
      <div class="space-y-6">
        <div class="space-y-2">
          <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Chapter Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="Chapter Name"
            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all"
            autofocus
            (keyup.enter)="onSave()"
          />
        </div>

        <div class="pt-4 border-t border-border-theme/10">
          <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">Danger Zone</label>
          <button
            appButton
            variant="outline"
            class="w-full !text-rose-500 !border-rose-500/20 hover:!bg-rose-500/10 flex items-center justify-center gap-2 group transition-all"
            (click)="onDelete()"
            [disabled]="data.isLastChapter"
          >
            <ng-icon name="heroTrash" class="group-hover:scale-110 transition-transform"></ng-icon>
            Delete Chapter
          </button>
          @if (data.isLastChapter) {
            <p class="mt-2 text-[10px] text-slate-500 italic text-center">Cannot delete the last chapter of a study.</p>
          }
        </div>
      </div>

      <div actions>
        <button appButton variant="ghost" (click)="dialogRef.close()">Cancel</button>
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
