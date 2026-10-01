import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrash, heroXMark, heroKey, heroUsers, heroUserPlus } from '@ng-icons/heroicons/outline';

import { StudyService } from '../../services/study.service';
import { StudyFacade } from '../../facade/study.facade';
import { ToastService } from '../../../../core/services/toast.service';
import { AddMemberDialogComponent, AddMemberResult } from '../add-member-dialog/add-member-dialog.component';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

/**
 * Standalone Study Members Dialog Component.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Separates member management from general settings into a focused dialog
 * matching the design language of `CreateStudyDialogComponent`.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Real-time websocket viewers and persistent collaborators are tracked independently.
 * - Sub-dialogs (AddMember, ConfirmDelete) are stacked with proper CDK backdrop.
 * - Role edits and removals are guarded by `isOwner()`.
 */
@Component({
  selector: 'app-study-members-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      heroTrash,
      heroXMark,
      heroKey,
      heroUsers,
      heroUserPlus,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-members-dialog.component.html',
})
export class StudyMembersDialogComponent {
  dialogRef = inject(DialogRef<void>);
  private studyService = inject(StudyService);
  public facade = inject(StudyFacade);
  private toastService = inject(ToastService);
  private dialog = inject(Dialog);

  study = this.studyService.currentStudy;
  isOwner = this.studyService.isOwner;
  isClassActive = this.studyService.isClassActive;
  viewers = this.studyService.viewerNames;
  lockHolderId = this.facade.lockHolderId;

  searchQuery = signal('');

  private normalizedQuery = computed(() => this.searchQuery().trim().toLowerCase());

  filteredOwner = computed(() => {
    const owner = this.study()?.owner;
    if (!owner) return null;
    const q = this.normalizedQuery();
    if (!q) return owner;
    return owner.name.toLowerCase().includes(q) ? owner : null;
  });

  filteredCollaborators = computed(() => {
    const collabs = this.study()?.collaborators || [];
    const q = this.normalizedQuery();
    if (!q) return collabs;
    return collabs.filter((c) => (c.username || '').toLowerCase().includes(q));
  });

  filteredViewers = computed(() => {
    const vList = this.viewers();
    const q = this.normalizedQuery();
    if (!q) return vList;
    return vList.filter((v) => (v.userName || '').toLowerCase().includes(q));
  });

  totalCount = computed(() => {
    const s = this.study();
    const collabs = s?.collaborators?.length || 0;
    const viewers = this.viewers().length;
    return 1 + collabs + viewers;
  });

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
          },
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
        confirmText: 'Remove',
      },
    });

    confirmRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.studyService.removeCollaborator(s.id, userId).subscribe({
          next: () => {
            this.toastService.show('Member removed successfully', 'success');
            this.studyService.getStudy(s.id);
          },
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
      },
    });
  }

  grantBoardControl(userId: string) {
    this.studyService.grantBoardControl(userId);
  }

  revokeBoardControl() {
    this.studyService.revokeBoardControl();
  }
}
