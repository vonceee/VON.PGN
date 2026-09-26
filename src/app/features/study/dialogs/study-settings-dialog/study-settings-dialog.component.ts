import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, Dialog, DIALOG_DATA } from '@angular/cdk/dialog';
import { Router } from '@angular/router';

import { StudyService } from '../../services/study.service';
import { StudyFacade } from '../../facade/study.facade';
import { ToastService } from '../../../../core/services/toast.service';

import { AddMemberDialogComponent, AddMemberResult } from '../add-member-dialog/add-member-dialog.component';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

import { StudySettingsComponent } from '../../study-sidebar/components/study-settings/study-settings.component';
import { StudyMembersComponent } from '../../study-sidebar/components/study-members/study-members.component';
import { StudyExportComponent } from '../../study-sidebar/components/study-export/study-export.component';

export type StudySettingsTab = 'general' | 'members' | 'export';

export interface StudySettingsDialogData {
  initialTab?: StudySettingsTab;
}

/**
 * Unified Study Settings Dialog Component.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Consolidates General settings, Member management, and Study PGN Export into a unified
 * modal dialog. This cleans up the persistent study sidebar dock and gives the study room
 * a focused, distraction-free analysis workspace.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Only study owners have access to this dialog.
 * - Sub-dialogs (AddMember, ConfirmDelete) are opened modally over this dialog with proper z-indexing.
 * - Tabs maintain consistent layout without disrupting background chessboard or chapters navigation.
 */
@Component({
  selector: 'app-study-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    StudySettingsComponent,
    StudyMembersComponent,
    StudyExportComponent
  ],
  templateUrl: './study-settings-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class StudySettingsDialogComponent {
  dialogRef = inject(DialogRef<void>);
  data = inject<StudySettingsDialogData | null>(DIALOG_DATA, { optional: true });
  private studyService = inject(StudyService);
  public facade = inject(StudyFacade);
  private toastService = inject(ToastService);
  private dialog = inject(Dialog);
  private router = inject(Router);

  study = this.studyService.currentStudy;
  isOwner = this.studyService.isOwner;
  isClassActive = this.studyService.isClassActive;
  currentChapter = this.studyService.currentChapter;
  viewerNames = this.studyService.viewerNames;

  activeTab = signal<StudySettingsTab>(this.data?.initialTab || 'general');

  memberCount = computed(() => {
    const s = this.study();
    if (!s) return 0;
    const collabs = s.collaborators?.length || 0;
    return 1 + collabs; // Owner + collaborators
  });

  handleSettingsSaved(payload: {
    name: string;
    visibility: string;
    engine_visibility: string;
    export_visibility: string;
    category: string;
    orientation: string;
    preview_fen?: string;
    preview_last_move?: string;
  }) {
    const s = this.study();
    if (!s) return;

    this.studyService.updateStudy(s.id, payload).subscribe({
      next: () => {
        this.toastService.show('Study settings updated', 'success');
        this.studyService.getStudy(s.id);
        this.dialogRef.close();
      },
      error: () => this.toastService.show('Failed to update settings', 'error')
    });
  }

  handleChatCleared() {
    const s = this.study();
    if (!s) return;
    this.studyService.clearStudyChat(s.id).subscribe({
      next: () => {
        this.studyService.emitClearChat();
        this.toastService.show('Chat history cleared', 'success');
      },
      error: () => this.toastService.show('Failed to clear chat', 'error')
    });
  }

  handleStudyDeleted() {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    this.studyService.deleteStudy(s.id).subscribe({
      next: () => {
        this.toastService.show('Study deleted successfully', 'success');
        this.dialogRef.close();
        this.router.navigate(['/study']);
      },
      error: () => this.toastService.show('Failed to delete study', 'error')
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
        this.toastService.show('Member permissions updated', 'success');
        this.studyService.getStudy(this.study()!.id);
      }
    });
  }

  grantBoardControl(userId: string) {
    this.studyService.grantBoardControl(userId);
  }

  revokeBoardControl() {
    this.studyService.revokeBoardControl();
  }

  handleExport(payload: { option: 'current' | 'all' | 'selected'; selectedIds: Set<number> }) {
    const s = this.study();
    if (!s) return;

    if (payload.option === 'current') {
      const current = this.currentChapter();
      if (current) {
        this.studyService.exportPgn(s.id, [current.id]);
      } else {
        this.toastService.show('No active chapter to export', 'error');
      }
    } else if (payload.option === 'all') {
      this.studyService.exportPgn(s.id);
    } else if (payload.option === 'selected') {
      const ids = Array.from(payload.selectedIds);
      if (ids.length > 0) {
        this.studyService.exportPgn(s.id, ids);
      } else {
        this.toastService.show('Please select at least one chapter to export', 'error');
      }
    }
  }
}
