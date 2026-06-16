import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ButtonComponent } from '@shared/ui';
import { StudyChapter } from '../../../core/models/study.model';
import { AddChapterDialogComponent, AddChapterDialogResult } from '../dialogs/add-chapter-dialog/add-chapter-dialog.component';
import { EditChapterDialogComponent, EditChapterDialogResult } from '../dialogs/edit-chapter-dialog/edit-chapter-dialog.component';
import { ConfirmDeleteDialogComponent } from '../dialogs/confirm-delete-dialog/confirm-delete-dialog.component';
import { ViewersDialogComponent } from '../dialogs/viewers-dialog/viewers-dialog.component';
import { StudyInfoDialogComponent } from '../dialogs/study-info-dialog/study-info-dialog.component';
import { StudyChatComponent } from '../study-chat/study-chat.component';
import { WebrtcService } from '../../../core/services/webrtc.service';
import { input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { heroEye, heroPhone, heroPhoneXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-study-sidebar',
  standalone: true,
  imports: [CommonModule, NgIconComponent, ButtonComponent, DialogModule, StudyChatComponent, DragDropModule],
  providers: [provideIcons({ heroEye, heroPhone, heroPhoneXMark })],
  templateUrl: './study-sidebar.component.html',
  host: {
    'class': 'block h-full overflow-hidden'
  }
})
export class StudySidebarComponent {
  private studyService = inject(StudyService);
  private dialog = inject(Dialog);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  public webrtc = inject(WebrtcService);

  isClassActive = this.studyService.isClassActive;
  isOwner = this.studyService.isOwner;
  hasJoinedClass = this.studyService.hasJoinedClass;

  toggleVideoCall() {
    if (this.webrtc.isCallActive()) {
      this.webrtc.leaveCall();
    } else {
      this.webrtc.joinCall().catch(err => {
        console.error('[StudySidebarComponent] Error joining video call:', err);
      });
    }
  }

  // Inputs
  isLargeScreen = input.required<boolean>();
  isSyncing = input.required<boolean>();
  canEdit = input.required<boolean>();
  isTabMode = input<boolean>(false);
  displayMode = input<'all' | 'chapters' | 'chat'>('all');

  // Signals from service
  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  viewerCount = this.studyService.viewerCount;
  viewerNames = this.studyService.viewerNames;

  /**
   * Switches the active chapter for the current user.
   *
   * WHY: Chapter navigation is intentionally ungated for view-only members and
   * guests. Blocking it (the old `isSyncing() && !canEdit()` guard) prevented
   * non-editors from reading any chapter other than the one the owner was on,
   * making the study effectively unusable for viewers. Chapter selection is a
   * read-only local operation; only the subsequent `emitChapterChange` call
   * (which is canEdit-gated) affects other connected clients.
   */
  selectChapter(chap: StudyChapter) {
    if (this.currentChapter()?.id === chap.id) return;

    this.studyService.currentChapter.set(chap);
    if (this.canEdit()) {
      this.studyService.emitChapterChange(
        this.study()!.id,
        chap.id,
        chap.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        chap.moves || [],
        chap.orientation,
        this.isSyncing()
      );
    }
  }

  createChapter() {
    if (!this.canEdit()) return;
    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<AddChapterDialogResult>(AddChapterDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: {
        defaultName: `Chapter ${(s.chapters?.length ?? 0) + 1}`,
      }
    });

    dialogRef.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;

        if (result.type === 'pgn' && result.pgn) {
          this.studyService.importPgn(s.id, result.pgn).subscribe({
            next: (res) => {
              const firstNewChapter = (res.data?.chapters || res.chapters)?.[0];
              this.studyService.getStudy(s.id, firstNewChapter?.id);
              this.toastService.show(res.message || 'Import successful!', 'success');
            },
            error: (err) => {
              console.error('Import failed:', err);
              this.toastService.show(err.error?.message || 'Failed to import PGN.', 'error');
            }
          });
        } else {
          this.studyService.addChapter(s.id, result.name, result.fen, result.orientation).subscribe({
            next: (res) => {
              const newChapter = res?.data || res;
              this.studyService.getStudy(s.id, newChapter.id);
              this.toastService.show('Chapter created successfully!', 'success');
            },
          });
        }
      });
  }

  onEditChapter(event: MouseEvent, chap: StudyChapter) {
    if (!this.canEdit()) return;
    event.stopPropagation();

    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<EditChapterDialogResult>(EditChapterDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: {
        currentName: chap.name,
        currentOrientation: chap.orientation || 'white',
        isLastChapter: (s.chapters?.length ?? 0) <= 1
      }
    });

    dialogRef.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;

        if (result.action === 'save' && result.name) {
          this.studyService.updateChapter(s.id, chap.id, {
            name: result.name,
            orientation: result.orientation
          }).subscribe({
            next: () => {
              this.toastService.show('Chapter updated', 'success');
              this.studyService.getStudy(s.id);
            },
            error: () => this.toastService.show('Failed to update chapter', 'error')
          });
        } else if (result.action === 'delete') {
          const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
            data: {
              title: 'Delete Chapter',
              message: `Are you sure you want to delete "${chap.name}"?`,
              confirmText: 'Delete'
            }
          });

          confirmRef.closed
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
              if (confirmed) {
                this.studyService.deleteChapter(s.id, chap.id).subscribe({
                  next: () => {
                    this.toastService.show('Chapter deleted', 'success');
                    if (this.currentChapter()?.id === chap.id) {
                      const remaining = s.chapters?.filter(c => c.id !== chap.id) || [];
                      if (remaining.length > 0) {
                        this.selectChapter(remaining[0]);
                      } else {
                        this.router.navigate(['/study']);
                      }
                    }
                    this.studyService.getStudy(s.id);
                  }
                });
              }
            });
        }
      });
  }

  openViewers() {
    this.dialog.open(ViewersDialogComponent, {
      data: {
        viewers: this.viewerNames(),
        count: this.viewerCount()
      }
    });
  }

  openStudyInfo() {
    this.dialog.open(StudyInfoDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: {
        isOwner: this.isOwner(),
        canEdit: this.canEdit(),
        isSyncing: this.isSyncing()
      }
    });
  }

  onDrop(event: CdkDragDrop<StudyChapter[]>) {
    if (!this.canEdit()) return;
    const s = this.study();
    if (!s || !s.chapters) return;

    // Local update for instant feedback
    const chapters = [...s.chapters];
    moveItemInArray(chapters, event.previousIndex, event.currentIndex);

    this.studyService.currentStudy.update(curr => curr ? { ...curr, chapters } : null);

    // Persist to backend
    const chapterIds = chapters.map(c => c.id);
    this.studyService.reorderChapters(s.id, chapterIds).subscribe({
      error: () => {
        this.toastService.show('Failed to save new order', 'error');
        this.studyService.getStudy(s.id); // Revert on error
      }
    });
  }
}
