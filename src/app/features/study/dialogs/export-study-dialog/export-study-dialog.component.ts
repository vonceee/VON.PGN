import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { StudyService } from '../../services/study.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StudyChapter } from '../../models/study.model';

/**
 * Standalone Study Export Dialog Component.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Separates the study PGN export workflow from the multi-tab settings modal into a dedicated,
 * distraction-free dialog matching the streamlined design language of `CreateStudyDialog`.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Reads current study and chapter state directly from reactive StudyService signals.
 * - Handles 'current' chapter fallback gracefully if no active chapter is selected.
 * - Automatically closes upon dispatching download payload to provide immediate feedback.
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
  private toastService = inject(ToastService);

  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;

  exportOption = signal<'current' | 'all' | 'selected'>('current');
  selectedChapterIds = signal<Set<number>>(new Set());

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
}
