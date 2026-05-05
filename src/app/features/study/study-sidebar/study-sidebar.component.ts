import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEye } from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '@shared/ui';
import { StudyChapter } from '../../../core/models/study.model';
import { AddChapterDialogComponent, AddChapterDialogResult } from '../dialogs/add-chapter-dialog/add-chapter-dialog.component';
import { EditChapterDialogComponent, EditChapterDialogResult } from '../dialogs/edit-chapter-dialog/edit-chapter-dialog.component';
import { ConfirmDeleteDialogComponent } from '../dialogs/confirm-delete-dialog/confirm-delete-dialog.component';
import { ViewersDialogComponent } from '../dialogs/viewers-dialog/viewers-dialog.component';
import { StudyChatComponent } from '../study-chat/study-chat.component';
import { input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-study-sidebar',
  standalone: true,
  imports: [CommonModule, NgIconComponent, ButtonComponent, DialogModule, StudyChatComponent],
  providers: [provideIcons({ heroEye })],
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

  // Inputs
  isLargeScreen = input.required<boolean>();
  isSyncing = input.required<boolean>();
  canEdit = input.required<boolean>();

  // Signals from service
  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  viewerCount = this.studyService.viewerCount;
  viewerNames = this.studyService.viewerNames;

  selectChapter(chap: StudyChapter) {
    if (this.isSyncing() && !this.canEdit()) return;
    if (this.currentChapter()?.id === chap.id) return;
    
    this.studyService.currentChapter.set(chap);
    if (this.canEdit()) {
      this.studyService.emitChapterChange(
        this.study()!.id,
        chap.id,
        chap.current_fen,
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
              this.toastService.show('Failed to import PGN.', 'error');
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
}
