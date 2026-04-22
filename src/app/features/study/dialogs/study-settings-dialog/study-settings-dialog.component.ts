import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-study-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper title="Study Settings" (close)="dialogRef.close()">
      <div class="space-y-4">
        <!-- Study Name -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Study Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="e.g. My Openings Analysis"
            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all"
          />
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            [(ngModel)]="description"
            rows="3"
            placeholder="A brief description of this study..."
            class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all resize-none"
          ></textarea>
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
          Save Changes
        </button>
      </div>
    </app-dialog-wrapper>
  `,
})
export class StudySettingsDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<any>);
  data = inject<any>(DIALOG_DATA);
  
  name = signal('');
  description = signal('');
  visibility = signal<'public' | 'private' | 'unlisted'>('public');

  ngOnInit() {
    if (this.data) {
      this.name.set(this.data.name || '');
      this.description.set(this.data.description || '');
      this.visibility.set(this.data.visibility || 'public');
    }
  }

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close({ 
        name: this.name().trim(), 
        description: this.description().trim(),
        visibility: this.visibility() 
      });
    }
  }
}
