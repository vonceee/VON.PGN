import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-create-study-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper title="Create New Study" (close)="dialogRef.close()">
      <div class="space-y-4">
        <!-- Study Name -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Study Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="e.g. My Openings Analysis"
            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all"
            autofocus
          />
        </div>

        <!-- Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Visibility</label>
          <select
            [(ngModel)]="visibility"
            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none dark:text-white transition-all"
          >
            <option value="public">Public (Everyone can see)</option>
            <option value="unlisted">Unlisted (Hidden from search)</option>
            <option value="private">Private (Only me)</option>
          </select>
        </div>
      </div>

      <div actions>
        <button appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
        <button appButton variant="primary" (click)="onSubmit()" [disabled]="!name().trim()">
          Create Study
        </button>
      </div>
    </app-dialog-wrapper>
  `,
})
export class CreateStudyDialogComponent {
  dialogRef = inject(DialogRef<any>);
  
  name = signal('');
  visibility = signal<'public' | 'private' | 'unlisted'>('public');

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close({ 
        name: this.name().trim(), 
        visibility: this.visibility() 
      });
    }
  }
}
