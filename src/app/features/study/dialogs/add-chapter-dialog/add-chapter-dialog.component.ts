import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-add-chapter-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper title="Add New Chapter" (close)="dialogRef.close()">
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Chapter Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="e.g. Chapter 1"
            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all"
            autofocus
          />
        </div>
      </div>

      <div actions>
        <button appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
        <button appButton variant="primary" (click)="onSubmit()" [disabled]="!name().trim()">
          Add Chapter
        </button>
      </div>
    </app-dialog-wrapper>
  `,
})
export class AddChapterDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<string>);
  data = inject<{ defaultName?: string }>(DIALOG_DATA, { optional: true });
  
  name = signal('');

  ngOnInit() {
    if (this.data?.defaultName) {
      this.name.set(this.data.defaultName);
    }
  }

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close(this.name().trim());
    }
  }
}
