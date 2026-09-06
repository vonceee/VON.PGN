import { Component, input, output, signal, effect, inject, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Study } from '../../../../../core/models/study.model';
import { StudyNavigationFacade } from '../../../services/study-navigation.facade';
import { SelectComponent, SelectItem, TextInputComponent } from '@shared/ui';

@Component({
  selector: 'app-study-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent, TextInputComponent],
  templateUrl: './study-settings.component.html'
})
export class StudySettingsComponent {
  study = input.required<Study | null>();
  isOwner = input.required<boolean>();

  readonly visibilityOptions: SelectItem<'public' | 'unlisted' | 'private'>[] = [
    { label: 'Public (Everyone can see)', value: 'public' },
    { label: 'Unlisted (Hidden from search)', value: 'unlisted' },
    { label: 'Private (Only me)', value: 'private' },
  ];

  readonly engineVisibilityOptions: SelectItem<'everyone' | 'owner'>[] = [
    { label: 'Everyone', value: 'everyone' },
    { label: 'Only me', value: 'owner' },
  ];

  readonly exportVisibilityOptions: SelectItem<'everyone' | 'owner'>[] = [
    { label: 'Everyone', value: 'everyone' },
    { label: 'Only me', value: 'owner' },
  ];

  readonly categoryOptions: SelectItem<'general' | 'opening_repertoire' | 'middlegame' | 'endgame'>[] = [
    { label: 'General Study', value: 'general' },
    { label: 'Opening Repertoire', value: 'opening_repertoire' },
    { label: 'Middlegame', value: 'middlegame' },
    { label: 'Endgame', value: 'endgame' },
  ];

  readonly repertoireOrientationOptions: SelectItem<'white' | 'black'>[] = [
    { label: 'White Repertoire', value: 'white' },
    { label: 'Black Repertoire', value: 'black' },
  ];

  private navFacade = inject(StudyNavigationFacade);

  settingsPreviewLastMove = model<string | null>(null);
  settingsOrientation = model<'white' | 'black'>('white');
  isEditingPreview = model<boolean>(false);

  settingsSaved = output<{ 
    name: string; 
    visibility: string; 
    engine_visibility: string; 
    export_visibility: string; 
    category: string; 
    orientation: string;
    preview_fen?: string;
    preview_last_move?: string;
  }>();
  chatCleared = output<void>();
  studyDeleted = output<void>();
  cancelled = output<void>();

  settingsName = signal('');
  settingsVisibility = signal<'public' | 'unlisted' | 'private'>('public');
  settingsEngineVisibility = signal<'everyone' | 'owner'>('everyone');
  settingsExportVisibility = signal<'everyone' | 'owner'>('owner');
  settingsCategory = signal<'general' | 'opening_repertoire' | 'middlegame' | 'endgame'>('general');

  isConfirmingDeleteStudy = signal(false);
  deleteStudyConfirmText = signal('');
  isChatCleared = signal(false);

  private fenBackup = '';

  constructor() {
    effect(() => {
      const s = this.study();
      if (s) {
        this.settingsName.set(s.name || '');
        this.settingsVisibility.set(s.visibility || 'public');
        this.settingsEngineVisibility.set(s.engine_visibility || 'everyone');
        this.settingsExportVisibility.set(s.export_visibility || 'owner');
        this.settingsCategory.set(s.category || 'general');
      }
    });
  }

  openPreviewBoardEditor() {
    this.isEditingPreview.set(true);
  }

  savePreviewBoardPosition() {
    this.isEditingPreview.set(false);
  }

  cancelPreviewBoardEditor() {
    this.isEditingPreview.set(false);
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
      orientation: this.settingsCategory() === 'opening_repertoire' ? this.settingsOrientation() : 'white',
      preview_last_move: this.settingsPreviewLastMove() || undefined
    });
  }
}
