import { Component, inject, DestroyRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { UserHovercardDirective } from '@shared/directives';
import { StudyChapter } from '../../../core/models/study.model';
import { AddChapterDialogComponent, AddChapterDialogResult } from '../dialogs/add-chapter-dialog/add-chapter-dialog.component';
import { EditChapterDialogComponent, EditChapterDialogResult } from '../dialogs/edit-chapter-dialog/edit-chapter-dialog.component';
import { ConfirmDeleteDialogComponent } from '../dialogs/confirm-delete-dialog/confirm-delete-dialog.component';

import { AddMemberDialogComponent, AddMemberResult } from '../dialogs/add-collaborator-dialog/add-collaborator-dialog.component';
import { StudySettingsDialogComponent } from '../dialogs/study-settings-dialog/study-settings-dialog.component';
import { StudyChatComponent } from '../study-chat/study-chat.component';
import { WebrtcService } from '../../../core/services/webrtc.service';
import { input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { heroEye, heroPhone, heroPhoneXMark, heroChatBubbleLeftRight, heroUsers, heroCog6Tooth, heroPlus } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-study-sidebar',
  standalone: true,
  imports: [CommonModule, NgIconComponent, DialogModule, StudyChatComponent, DragDropModule, FormsModule, UserHovercardDirective],
  providers: [provideIcons({ heroEye, heroPhone, heroPhoneXMark, heroChatBubbleLeftRight, heroUsers, heroCog6Tooth, heroPlus })],
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

  isChatExpanded = signal(true);
  isMembersExpanded = signal(false);

  toggleChat() {
    this.isChatExpanded.update((v) => {
      const next = !v;
      if (next) {
        this.isMembersExpanded.set(false);
      }
      return next;
    });
  }

  toggleMembers() {
    this.isMembersExpanded.update((v) => {
      const next = !v;
      if (next) {
        this.isChatExpanded.set(false);
      }
      return next;
    });
  }

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




  addMember() {
    if (!this.isOwner()) return;
    const dialogRef = this.dialog.open<AddMemberResult>(AddMemberDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
    });
    dialogRef.closed.subscribe((result) => {
      if (result) {
        const canEdit = result.role === 'collaborator';
        this.studyService.addCollaborator(this.study()!.id, result.user.uid, canEdit).subscribe({
          next: () => {
            const roleName = result.role === 'collaborator' ? 'Collaborator' : 'Member';
            this.toastService.show(`${roleName} added successfully`, 'success');
            this.studyService.getStudy(this.study()!.id);
          }
        });
      }
    });
  }

  removeMember(userId: string) {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Remove member',
        message: 'Are you sure you want to remove this member?',
        confirmText: 'Remove'
      }
    });

    confirmRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.studyService.removeCollaborator(s.id, userId).subscribe({
          next: () => {
            this.toastService.show('Member removed successfully', 'success');
            this.studyService.getStudy(s.id);
          }
        });
      }
    });
  }

  toggleMemberPermission(userId: string, canEdit: boolean) {
    if (!this.isOwner()) return;
    this.studyService.updateCollaboratorPermission(this.study()!.id, userId, canEdit).subscribe({
      next: () => {
        const roleName = canEdit ? 'Collaborator' : 'Member';
        this.toastService.show(`Role updated to ${roleName}`, 'success');
        this.studyService.getStudy(this.study()!.id);
      }
    });
  }

  openSettings() {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<any>(StudySettingsDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: { name: s.name, visibility: s.visibility, engine_visibility: s.engine_visibility, category: s.category, orientation: s.orientation }
    });

    dialogRef.closed.subscribe((result) => {
      if (!result) return;
      if (result.action === 'save') {
        this.studyService.updateStudy(s.id, {
          name: result.name,
          visibility: result.visibility,
          engine_visibility: result.engine_visibility,
          category: result.category,
          orientation: result.orientation
        }).subscribe({
          next: () => {
            this.toastService.show('Study settings updated', 'success');
            this.studyService.getStudy(s.id);
          }
        });
      } else if (result.action === 'clear_chat') {
        this.studyService.clearStudyChat(s.id).subscribe({
          next: () => {
            this.studyService.emitClearChat();
            this.toastService.show('Chat lobby cleared', 'success');
          }
        });
      } else if (result.action === 'delete') {
        this.onDeleteStudy();
      }
    });
  }

  onDeleteStudy() {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete study',
        message: 'Are you sure you want to delete this study? This will delete all chapters and comments forever.',
        confirmText: 'Delete forever'
      }
    });

    confirmRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.studyService.deleteStudy(s.id).subscribe({
          next: () => {
            this.toastService.show('Study deleted successfully', 'success');
            this.router.navigate(['/study']);
          }
        });
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return this.formatDate(dateStr);
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
