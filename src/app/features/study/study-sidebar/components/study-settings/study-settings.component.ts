import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Study } from '../../../models/study.model';
import { SelectComponent, SelectItem, TextInputComponent } from '@shared/ui';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-study-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent, TextInputComponent],
  templateUrl: './study-settings.component.html'
})
export class StudySettingsComponent {
  study = input.required<Study | null>();
  isOwner = input.required<boolean>();
  currentFen = input<string>('');

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

  private toastService = inject(ToastService);

  settingsPreviewFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  settingsPreviewLastMove = signal<string | null>(null);
  settingsOrientation = signal<'white' | 'black'>('white');

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
        this.settingsPreviewFen.set(s.preview_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        this.settingsPreviewLastMove.set(s.preview_last_move || null);
      }
    });
  }

  useCurrentPosition() {
    const fen = this.currentFen();
    if (fen) {
      this.settingsPreviewFen.set(fen);
      this.toastService.show('Current board position captured for preview', 'success');
    }
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
