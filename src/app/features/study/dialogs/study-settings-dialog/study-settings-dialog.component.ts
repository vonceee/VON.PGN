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
          <label class="text-sm font-semibold text-content">Study Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="e.g. My Openings Analysis"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-lg text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted dark:text-content transition-all"
          />
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Description</label>
          <textarea
            [(ngModel)]="description"
            rows="3"
            placeholder="A brief description of this study..."
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-lg text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted dark:text-content transition-all resize-none"
          ></textarea>
        </div>

        <!-- Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Visibility</label>
          <select
            [(ngModel)]="visibility"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-lg text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none dark:text-content transition-all"
          >
            <option value="public">Public (Everyone can see)</option>
            <option value="unlisted">Unlisted (Hidden from search)</option>
            <option value="private">Private (Only me)</option>
          </select>
        </div>
      </div>

      <button actions appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
      <button actions appButton variant="primary" (click)="onSubmit()" [disabled]="!name().trim()">
        Save Changes
      </button>
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
