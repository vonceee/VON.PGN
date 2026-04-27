import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ToastService } from '../../../core/services/toast.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCalendar, heroClock, heroUserPlus } from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '@shared/ui';
import { UserHovercardDirective } from '@shared/directives';
import { AddCollaboratorDialogComponent } from '../dialogs/add-collaborator-dialog/add-collaborator-dialog.component';
import { ConfirmDeleteDialogComponent } from '../dialogs/confirm-delete-dialog/confirm-delete-dialog.component';
import { StudySettingsDialogComponent } from '../dialogs/study-settings-dialog/study-settings-dialog.component';
import { AddChapterDialogComponent, AddChapterDialogResult } from '../dialogs/add-chapter-dialog/add-chapter-dialog.component';
import { UserSearchResult } from '../../../core/services/user.service';

@Component({
  selector: 'app-study-info',
  standalone: true,
  imports: [CommonModule, MatSlideToggleModule, NgIconComponent, ButtonComponent, UserHovercardDirective, DialogModule],
  providers: [provideIcons({ heroCalendar, heroClock, heroUserPlus })],
  templateUrl: './study-info.component.html',
})
export class StudyInfoComponent {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private dialog = inject(Dialog);
  private toastService = inject(ToastService);

  // Inputs
  isOwner = input.required<boolean>();
  canEdit = input.required<boolean>();
  isSyncing = input.required<boolean>();

  // Outputs
  syncToggle = output<boolean>();
  flipBoard = output<void>();

  study = this.studyService.currentStudy;

  toggleSync() {
    this.syncToggle.emit(!this.isSyncing());
  }

  onFlipBoard() {
    this.flipBoard.emit();
  }

  addCollaborator() {
    if (!this.isOwner()) return;
    const dialogRef = this.dialog.open<UserSearchResult>(AddCollaboratorDialogComponent);
    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.studyService.addCollaborator(this.study()!.id, result.uid).subscribe({
          next: () => {
            this.toastService.show('Collaborator added', 'success');
            this.studyService.getStudy(this.study()!.id);
          }
        });
      }
    });
  }

  removeCollaborator(userId: string) {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Remove Collaborator',
        message: 'Are you sure you want to remove this collaborator?',
        confirmText: 'Remove'
      }
    });

    confirmRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.studyService.removeCollaborator(s.id, userId).subscribe({
          next: () => {
            this.toastService.show('Collaborator removed', 'success');
            this.studyService.getStudy(s.id);
          }
        });
      }
    });
  }

  toggleCollaboratorPermission(userId: string, canEdit: boolean) {
    if (!this.isOwner()) return;
    this.studyService.updateCollaboratorPermission(this.study()!.id, userId, canEdit).subscribe({
      next: () => {
        this.toastService.show(canEdit ? 'Permission granted' : 'Permission revoked', 'success');
        this.studyService.getStudy(this.study()!.id);
      }
    });
  }

  importPgn() {
    if (!this.canEdit()) return;
    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<AddChapterDialogResult>(AddChapterDialogComponent, {
      data: { 
        defaultName: `Chapter ${(s.chapters?.length ?? 0) + 1}`,
        tab: 'pgn'
      }
    });

    dialogRef.closed.subscribe((result) => {
      if (result?.pgn) {
        this.studyService.importPgn(s.id, result.pgn).subscribe({
          next: (res) => {
            const firstNewChapter = (res.data?.chapters || res.chapters)?.[0];
            this.studyService.getStudy(s.id, firstNewChapter?.id);
            this.toastService.show('Import successful!', 'success');
          }
        });
      }
    });
  }

  exportPgn() {
    if (this.study()) this.studyService.exportPgn(this.study()!.id);
  }

  openSettings() {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<any>(StudySettingsDialogComponent, {
      data: { name: s.name, visibility: s.visibility }
    });

    dialogRef.closed.subscribe((result) => {
      if (!result) return;
      if (result.action === 'save') {
        this.studyService.updateStudy(s.id, { name: result.name, visibility: result.visibility }).subscribe({
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
}
