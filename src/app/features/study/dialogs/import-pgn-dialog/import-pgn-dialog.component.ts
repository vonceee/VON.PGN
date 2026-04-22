import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-import-pgn-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper title="Import PGN" (close)="dialogRef.close()">
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Paste your Lichess Study PGN
          </label>
          <textarea
            [(ngModel)]="pgn"
            rows="8"
            placeholder="[Event '...']\n1. e4 e5 ..."
            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-mono focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all resize-none custom-scrollbar"
            autofocus
          ></textarea>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Note: All chapters from the PGN will be imported into this study.
          </p>
        </div>
      </div>

      <div actions>
        <button appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
        <button appButton variant="primary" (click)="onSubmit()" [disabled]="!pgn().trim()">
          Start Import
        </button>
      </div>
    </app-dialog-wrapper>
  `,
})
export class ImportPgnDialogComponent {
  dialogRef = inject(DialogRef<string>);
  
  pgn = signal('');

  onSubmit() {
    if (this.pgn().trim()) {
      this.dialogRef.close(this.pgn().trim());
    }
  }
}
