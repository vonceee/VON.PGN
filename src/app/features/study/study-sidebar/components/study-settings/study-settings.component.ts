import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Study } from '../../../../../core/models/study.model';

@Component({
  selector: 'app-study-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './study-settings.component.html'
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
  isConfirmingDeleteStudy = signal(false);
  deleteStudyConfirmText = signal('');
  isChatCleared = signal(false);

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
    this.isChatCleared.set(true);
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
