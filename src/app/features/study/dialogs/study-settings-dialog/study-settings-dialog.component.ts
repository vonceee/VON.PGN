import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-study-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="bg-main rounded-4xl shadow-xl w-full p-8 font-sans space-y-8 relative">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl text-content">Study settings</h2>
      </div>

      <div class="space-y-4">
        <!-- Study Name -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Study name</label>
          <input
            type="text"
            [ngModel]="name()"
            (ngModelChange)="name.set($event)"
            maxlength="100"
            placeholder="e.g. My Openings Analysis"
            class="w-full px-4 py-2.5 bg-subtle rounded-xl text-sm outline-none placeholder:text-muted"
          />
        </div>

        <!-- Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Visibility</label>
          <div class="relative">
            <select
              [ngModel]="visibility()"
              (ngModelChange)="visibility.set($event)"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none appearance-none cursor-pointer text-content"
            >
              <option value="public">Public (Everyone can see)</option>
              <option value="unlisted">Unlisted (Hidden from search)</option>
              <option value="private">Private (Only me)</option>
            </select>
            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

        <!-- Engine Analysis Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Engine analysis</label>
          <div class="relative">
            <select
              [ngModel]="engineVisibility()"
              (ngModelChange)="engineVisibility.set($event)"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none appearance-none cursor-pointer text-content"
            >
              <option value="everyone">Everyone</option>
              <option value="owner">Only me</option>
            </select>
            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

        <!-- Category Selection -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Category</label>
          <div class="relative">
            <select
              [ngModel]="category()"
              (ngModelChange)="category.set($event)"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none appearance-none cursor-pointer text-content"
            >
              <option value="general">General Study</option>
              <option value="opening_repertoire">Opening Repertoire</option>
            </select>
            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

        <!-- Repertoire Side Selection (Only visible for repertoires) -->
        @if (category() === 'opening_repertoire') {
          <div class="space-y-2">
            <label class="text-sm font-semibold text-content">Repertoire side (bulk updates chapters)</label>
            <div class="relative">
              <select
                [ngModel]="orientation()"
                (ngModelChange)="orientation.set($event)"
                class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none appearance-none cursor-pointer text-content"
              >
                <option value="white">White Repertoire</option>
                <option value="black">Black Repertoire</option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="flex flex-col gap-3 w-full">
        <div class="flex gap-4 w-full">
          <button
            appButton
            variant="ghost"
            class="!text-rose-500 hover:!bg-rose-500/10 flex-1"
            (click)="onDelete()"
          >
            <span>Delete study</span>
          </button>

          <button
            appButton
            variant="ghost"
            class="hover:!bg-muted/10 flex-1"
            (click)="onClearChat()"
          >
            <span>Clear chat lobby</span>
          </button>
        </div>

        <div class="pt-4 flex gap-4 w-full border-t border-border-base">
          <button appButton variant="outline" (click)="dialogRef.close()" class="flex-1">
            <span>Cancel</span>
          </button>
          <button appButton variant="primary" (click)="onSubmit()" [disabled]="!name().trim()" class="flex-1">
            <span>Save changes</span>
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
