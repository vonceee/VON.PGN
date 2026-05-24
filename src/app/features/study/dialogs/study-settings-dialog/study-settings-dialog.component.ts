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
            class="w-full px-4 py-2.5 bg-subtle  rounded-lg text-sm outline-none placeholder:text-muted  "
          />
        </div>

        <!-- Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Visibility</label>
          <select
            [(ngModel)]="visibility"
            class="w-full px-4 py-2.5 bg-subtle  rounded-lg text-sm outline-none  "
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
            class="w-full px-4 py-2.5 bg-subtle  rounded-lg text-sm outline-none  "
          >
            <option value="everyone">Everyone</option>
            <option value="owner">Only me</option>
          </select>
        </div>

        <!-- Category Selection -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Category</label>
          <select
            [(ngModel)]="category"
            class="w-full px-4 py-2.5 bg-subtle  rounded-lg text-sm outline-none  "
          >
            <option value="general">General Study</option>
            <option value="opening_repertoire">Opening Repertoire</option>
          </select>
        </div>

        <!-- Repertoire Side Selection (Only visible for repertoires) -->
        @if (category() === 'opening_repertoire') {
          <div class="space-y-2">
            <label class="text-sm font-semibold text-content">Repertoire Side (Bulk Updates Chapters)</label>
            <select
              [(ngModel)]="orientation"
              class="w-full px-4 py-2.5 bg-subtle rounded-lg text-sm outline-none"
            >
              <option value="white">White Repertoire</option>
              <option value="black">Black Repertoire</option>
            </select>
          </div>
        }
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
  category = signal<'general' | 'opening_repertoire'>('general');
  orientation = signal<'white' | 'black'>('white');

  ngOnInit() {
    if (this.data) {
      this.name.set(this.data.name || '');
      this.visibility.set(this.data.visibility || 'public');
      this.engineVisibility.set(this.data.engine_visibility || 'everyone');
      this.category.set(this.data.category || 'general');
      this.orientation.set(this.data.orientation || 'white');
    }
  }

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close({ 
        action: 'save',
        name: this.name().trim(), 
        visibility: this.visibility(),
        engine_visibility: this.engineVisibility(),
        category: this.category(),
        orientation: this.category() === 'opening_repertoire' ? this.orientation() : 'white'
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
