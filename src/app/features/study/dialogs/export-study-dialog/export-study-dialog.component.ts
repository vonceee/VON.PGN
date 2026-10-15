import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { StudyService } from '../../services/study.service';
import { StudyNavigationFacade } from '../../facade/study-navigation.facade';
import { ToastService } from '../../../../core/services/toast.service';
import { StudyChapter } from '../../models/study.model';

/**
 * Standalone Study Export Dialog Component.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Separates the study PGN export workflow from the multi-tab settings modal into a dedicated,
 * distraction-free dialog matching the streamlined design language of `CreateStudyDialog`.
 * Provides instant active-board FEN copying directly to clipboard without toast interruptions.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Reads current study and chapter state directly from reactive StudyService signals.
 * - Resolves active position FEN from StudyNavigationFacade, falling back to chapter FENs.
 * - Handles 'current' chapter fallback gracefully if no active chapter is selected.
 * - Automatically closes upon dispatching PGN download payload to provide immediate feedback.
 * - Retains the modal open when copying FEN and transforms the Copy FEN button into a permanent checkmark.
 */
@Component({
  selector: 'app-export-study-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './export-study-dialog.component.html',
})
export class ExportStudyDialogComponent {
  dialogRef = inject(DialogRef<void>);
  private studyService = inject(StudyService);
  private navFacade = inject(StudyNavigationFacade);
  private toastService = inject(ToastService);

  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;

  exportOption = signal<'current' | 'all' | 'selected'>('current');
  selectedChapterIds = signal<Set<number>>(new Set());
  copiedFen = signal<boolean>(false);

  totalChapters = computed(() => this.study()?.chapters?.length || 0);

  constructor() {
    // Pre-select current chapter if available
    const cur = this.currentChapter();
    if (cur) {
      this.selectedChapterIds.set(new Set([cur.id]));
    }
  }

  toggleChapterSelection(chapterId: number) {
    this.selectedChapterIds.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  }

  selectAllChapters(select: boolean) {
    const s = this.study();
    if (!s || !s.chapters) return;

    if (select) {
      this.selectedChapterIds.set(new Set(s.chapters.map((c: StudyChapter) => c.id)));
    } else {
      this.selectedChapterIds.set(new Set());
    }
  }

  performExport() {
    const s = this.study();
    if (!s) return;

    const opt = this.exportOption();
    if (opt === 'current') {
      const current = this.currentChapter();
      if (current) {
        this.studyService.exportPgn(s.id, [current.id]);
        this.dialogRef.close();
      } else {
        this.toastService.show('No active chapter to export', 'error');
      }
    } else if (opt === 'all') {
      this.studyService.exportPgn(s.id);
      this.dialogRef.close();
    } else if (opt === 'selected') {
      const ids = Array.from(this.selectedChapterIds());
      if (ids.length > 0) {
        this.studyService.exportPgn(s.id, ids);
        this.dialogRef.close();
      } else {
        this.toastService.show('Please select at least one chapter to export', 'error');
      }
    }
  }

  /**
   * Copies the active board position's FEN string to the user's system clipboard.
   *
   * ARCHITECTURAL CHOICE (WHY):
   * Copies the current active board position (derived from StudyNavigationFacade)
   * without closing the dialog or firing toast notifications, immediately replacing
   * the button with a persistent checkmark indicator for seamless inline feedback.
   *
   * ASSUMPTIONS & EDGE CASES:
   * - Falls back to currentChapter current_fen or initial_fen if the navigation FEN is missing.
   * - Provides a document.execCommand fallback for non-secure contexts or legacy browsers.
   */
  copyFen(): void {
    const fen = this.navFacade.currentFen() ||
      this.currentChapter()?.current_fen ||
      this.currentChapter()?.initial_fen ||
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fen)
        .then(() => {
          this.copiedFen.set(true);
        })
        .catch(() => {
          this.fallbackCopyText(fen);
        });
    } else {
      this.fallbackCopyText(fen);
    }
  }

  private fallbackCopyText(text: string): void {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.copiedFen.set(true);
    } catch (e) {
      console.error('Failed to copy FEN:', e);
    }
  }
}
