import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { Router } from '@angular/router';

import { StudyService } from '../../services/study.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TextInputComponent, SelectComponent, SelectItem } from '@shared/ui';

export type StudySettingsTab = 'general' | 'members';

/**
 * Dedicated Study Settings Dialog Component.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Separates general study settings from member management into a clean modal
 * directly tailored to match `CreateStudyDialogComponent` layout.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Only study owners have access to destructive actions (Clear Chat, Delete Study).
 * - Live board FEN snapshot is fetched via `StudyFacade.currentFen()`.
 */
@Component({
  selector: 'app-study-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextInputComponent,
    SelectComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-settings-dialog.component.html',
})
export class StudySettingsDialogComponent {
  dialogRef = inject(DialogRef<void>);
  private studyService = inject(StudyService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  study = this.studyService.currentStudy;
  isOwner = this.studyService.isOwner;

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

  settingsName = signal('');
  settingsVisibility = signal<'public' | 'unlisted' | 'private'>('public');
  settingsEngineVisibility = signal<'everyone' | 'owner'>('everyone');
  settingsExportVisibility = signal<'everyone' | 'owner'>('owner');
  settingsCategory = signal<'general' | 'opening_repertoire' | 'middlegame' | 'endgame'>('general');
  settingsOrientation = signal<'white' | 'black'>('white');
  settingsPreviewFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  settingsPreviewLastMove = signal<string | null>(null);

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


  clearChat() {
    const s = this.study();
    if (!s) return;
    this.studyService.clearStudyChat(s.id).subscribe({
      next: () => {
        this.studyService.emitClearChat();
        this.isChatCleared.set(true);
        this.toastService.show('Chat history cleared', 'success');
      },
      error: () => this.toastService.show('Failed to clear chat', 'error'),
    });
  }

  onDeleteStudy() {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    this.studyService.deleteStudy(s.id).subscribe({
      next: () => {
        this.toastService.show('Study deleted successfully', 'success');
        this.dialogRef.close();
        this.router.navigate(['/study']);
      },
      error: () => this.toastService.show('Failed to delete study', 'error'),
    });
  }

  onSubmit() {
    const s = this.study();
    if (!s || !this.settingsName().trim()) return;

    this.studyService.updateStudy(s.id, {
      name: this.settingsName().trim(),
      visibility: this.settingsVisibility(),
      engine_visibility: this.settingsEngineVisibility(),
      export_visibility: this.settingsExportVisibility(),
      category: this.settingsCategory(),
      orientation: this.settingsCategory() === 'opening_repertoire' ? this.settingsOrientation() : 'white',
      preview_fen: this.settingsPreviewFen(),
      preview_last_move: this.settingsPreviewLastMove() || undefined,
    }).subscribe({
      next: () => {
        this.toastService.show('Study settings updated', 'success');
        this.studyService.getStudy(s.id);
        this.dialogRef.close();
      },
      error: () => this.toastService.show('Failed to update settings', 'error'),
    });
  }
}
