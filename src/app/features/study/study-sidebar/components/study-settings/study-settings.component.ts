import { Component, input, output, signal, effect, inject, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Study } from '../../../../../core/models/study.model';
import { StudyNavigationFacade } from '../../../services/study-navigation.facade';

@Component({
  selector: 'app-study-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './study-settings.component.html'
})
export class StudySettingsComponent {
  study = input.required<Study | null>();
  isOwner = input.required<boolean>();

  private navFacade = inject(StudyNavigationFacade);

  // Two-way bindings with sidebar signals
  settingsPreviewFen = model<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
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

  useCurrentBoardPosition() {
    const fen = this.navFacade.currentFen();
    const uci = this.navFacade.currentNode()?.uci || null;
    this.settingsPreviewFen.set(fen);
    this.settingsPreviewLastMove.set(uci);
  }

  openPreviewBoardEditor() {
    this.fenBackup = this.settingsPreviewFen();
    this.isEditingPreview.set(true);
  }

  savePreviewBoardPosition() {
    this.isEditingPreview.set(false);
  }

  cancelPreviewBoardEditor() {
    this.settingsPreviewFen.set(this.fenBackup);
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
      preview_fen: this.settingsPreviewFen(),
      preview_last_move: this.settingsPreviewLastMove() || undefined
    });
  }
}
