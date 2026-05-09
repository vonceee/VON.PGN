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
    <app-dialog-wrapper title="Study settings" (close)="dialogRef.close()">
      <div class="space-y-4">
        <!-- Study Name -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Study Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            maxlength="100"
            placeholder="e.g. My Openings Analysis"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-lg text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted  "
          />
        </div>

        <!-- Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Visibility</label>
          <select
            [(ngModel)]="visibility"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-lg text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none  "
          >
            <option value="public">Public (Everyone can see)</option>
            <option value="unlisted">Unlisted (Hidden from search)</option>
            <option value="private">Private (Only me)</option>
          </select>
        </div>

        <!-- Engine Analysis Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Engine Analysis</label>
          <select
            [(ngModel)]="engineVisibility"
            class="w-full px-4 py-2.5 bg-subtle border border-base rounded-lg text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none  "
          >
            <option value="everyone">Everyone</option>
            <option value="owner">Only me</option>
          </select>
          <p class="text-[10px] text-muted">Controls who can see the engine toggle and evaluation bar.</p>
        </div>
      </div>

      <button actions
        appButton
        variant="ghost"
        class="!text-rose-500 hover:!bg-rose-500/10"
        (click)="onDelete()"
      >
        Delete Study
      </button>

      <button actions
        appButton
        variant="ghost"
        class="hover:!bg-muted/10"
        (click)="onClearChat()"
      >
        Clear Chat Lobby
      </button>

      <div actions class="flex-1"></div>

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
  visibility = signal<'public' | 'private' | 'unlisted'>('public');
  engineVisibility = signal<'everyone' | 'owner'>('everyone');

  ngOnInit() {
    if (this.data) {
      this.name.set(this.data.name || '');
      this.visibility.set(this.data.visibility || 'public');
      this.engineVisibility.set(this.data.engine_visibility || 'everyone');
    }
  }

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close({ 
        action: 'save',
        name: this.name().trim(), 
        visibility: this.visibility(),
        engine_visibility: this.engineVisibility()
      });
    }
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }

  onClearChat() {
    this.dialogRef.close({ action: 'clear_chat' });
  }
}
