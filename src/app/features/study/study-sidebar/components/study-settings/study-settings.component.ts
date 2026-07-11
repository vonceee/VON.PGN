import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Study } from '../../../../../core/models/study.model';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-study-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="h-full flex flex-col min-h-0 bg-main rounded-lg">
      <!-- Scrollable Form Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        <!-- Study Name -->
        <div class="flex flex-col gap-2">
          <label for="study_name" class="text-sm">Study name</label>
          <input type="text" id="study_name" [ngModel]="settingsName()" (ngModelChange)="settingsName.set($event)"
            maxlength="100" placeholder="e.g. My Openings Analysis"
            class="w-full px-3 py-2 rounded-xl text-sm border border-border-base bg-main outline-none placeholder:text-muted/50" />
        </div>

        <!-- Visibility -->
        <div class="flex flex-col gap-2">
          <label for="visibility" class="text-sm">Visibility</label>
          <div class="relative w-full">
            <select id="visibility" [ngModel]="settingsVisibility()" (ngModelChange)="settingsVisibility.set($event)"
              class="w-full px-3 py-2 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none cursor-pointer"
              style="
                background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
                background-position: right 0.5rem center;
                background-size: 1.25rem;
              ">
              <option value="public">Public (Everyone can see)</option>
              <option value="unlisted">Unlisted (Hidden from search)</option>
              <option value="private">Private (Only me)</option>
            </select>
          </div>
        </div>

        <!-- Engine Analysis Visibility -->
        <div class="flex flex-col gap-2">
          <label for="engine_visibility" class="text-sm">Engine analysis</label>
          <div class="relative w-full">
            <select id="engine_visibility" [ngModel]="settingsEngineVisibility()"
              (ngModelChange)="settingsEngineVisibility.set($event)"
              class="w-full px-3 py-2 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none cursor-pointer"
              style="
                background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
                background-position: right 0.5rem center;
                background-size: 1.25rem;
              ">
              <option value="everyone">Everyone</option>
              <option value="owner">Only me</option>
            </select>
          </div>
        </div>

        <!-- Export PGN Visibility -->
        <div class="flex flex-col gap-2">
          <label for="export_visibility" class="text-sm">Export PGN</label>
          <div class="relative w-full">
            <select id="export_visibility" [ngModel]="settingsExportVisibility()"
              (ngModelChange)="settingsExportVisibility.set($event)"
              class="w-full px-3 py-2 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none cursor-pointer"
              style="
                background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
                background-position: right 0.5rem center;
                background-size: 1.25rem;
              ">
              <option value="everyone">Everyone</option>
              <option value="owner">Only me</option>
            </select>
          </div>
        </div>

        <!-- Category Selection -->
        <div class="flex flex-col gap-2">
          <label for="category" class="text-sm">Category</label>
          <div class="relative w-full">
            <select id="category" [ngModel]="settingsCategory()" (ngModelChange)="settingsCategory.set($event)"
              class="w-full px-3 py-2 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none cursor-pointer"
              style="
                background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
                background-position: right 0.5rem center;
                background-size: 1.25rem;
              ">
              <option value="general">General Study</option>
              <option value="opening_repertoire">Opening Repertoire</option>
              <option value="middlegame">Middlegame</option>
              <option value="endgame">Endgame</option>
            </select>
          </div>
        </div>

        <!-- Repertoire Side Selection -->
        @if (settingsCategory() === 'opening_repertoire') {
        <div class="flex flex-col gap-2">
          <label for="orientation_settings" class="text-sm">Repertoire side</label>
          <div class="relative w-full">
            <select id="orientation_settings" [ngModel]="settingsOrientation()"
              (ngModelChange)="settingsOrientation.set($event)"
              class="w-full px-3 py-2 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none cursor-pointer"
              style="
                  background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
                  background-position: right 0.5rem center;
                  background-size: 1.25rem;
                ">
              <option value="white">White Repertoire</option>
              <option value="black">Black Repertoire</option>
            </select>
          </div>
        </div>
        }

        <!-- Destructive actions -->
          @if (isOwner()) {
          <p class="text-sm text-muted">
              Permanently delete this study, including all chapters, commentary, and member access. This action cannot be undone.
          </p>  
          <button appButton variant="danger" (click)="onDeleteStudy()">
              <span>Delete study</span>
          </button>
          <p class="text-sm text-muted border-t border-border-base mt-2 pt-2">
            Delete all messages from the live chat room for all members.
          </p>
          <button appButton variant="danger" (click)="clearChat()">
            <span>Clear chat</span>
          </button>
          }
      </div>

      <!-- Save / Cancel Sticky Footer -->
      <div class="p-6 border-t border-border-base bg-main shrink-0 flex gap-3">
        <button appButton variant="outline" (click)="onCancel()" class="flex-1 animate-none">
          <span>Cancel</span>
        </button>
        <button appButton variant="primary" (click)="onSubmit()" [disabled]="!settingsName().trim()" class="flex-1 animate-none">
          <span>Save</span>
        </button>
      </div>
    </div>
  `
})
export class StudySettingsComponent {
  study = input.required<Study | null>();
  isOwner = input.required<boolean>();

  settingsSaved = output<{ name: string; visibility: string; engine_visibility: string; export_visibility: string; category: string; orientation: string }>();
  chatCleared = output<void>();
  studyDeleted = output<void>();
  cancelled = output<void>();

  settingsName = signal('');
  settingsVisibility = signal<'public' | 'unlisted' | 'private'>('public');
  settingsEngineVisibility = signal<'everyone' | 'owner'>('everyone');
  settingsExportVisibility = signal<'everyone' | 'owner'>('owner');
  settingsCategory = signal<'general' | 'opening_repertoire' | 'middlegame' | 'endgame'>('general');
  settingsOrientation = signal<'white' | 'black'>('white');

  constructor() {
    effect(() => {
      const s = this.study();
      if (s) {
        this.settingsName.set(s.name || '');
        this.settingsVisibility.set(s.visibility || 'public');
        this.settingsEngineVisibility.set(s.engine_visibility || 'everyone');
        this.settingsExportVisibility.set(s.export_visibility || 'owner');
        this.settingsCategory.set(s.category || 'general');
        this.settingsOrientation.set(s.orientation || 'white');
      }
    });
  }

  onCancel() {
    this.cancelled.emit();
  }

  clearChat() {
    this.chatCleared.emit();
  }

  onDeleteStudy() {
    this.studyDeleted.emit();
  }

  onSubmit() {
    if (!this.settingsName().trim()) return;
    this.settingsSaved.emit({
      name: this.settingsName().trim(),
      visibility: this.settingsVisibility(),
      engine_visibility: this.settingsEngineVisibility(),
      export_visibility: this.settingsExportVisibility(),
      category: this.settingsCategory(),
      orientation: this.settingsCategory() === 'opening_repertoire' ? this.settingsOrientation() : 'white'
    });
  }
}
