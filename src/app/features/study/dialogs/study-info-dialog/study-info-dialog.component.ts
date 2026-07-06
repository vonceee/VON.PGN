import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA, Dialog } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { StudyService } from '../../../../core/services/study.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { UserHovercardDirective } from '@shared/directives';
import { AddMemberDialogComponent, AddMemberResult } from '../add-member-dialog/add-member-dialog.component';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { StudySettingsDialogComponent } from '../study-settings-dialog/study-settings-dialog.component';

@Component({
  selector: 'app-study-info-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, UserHovercardDirective],
  templateUrl: './study-info-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class StudyInfoDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<any>);
  data = inject<any>(DIALOG_DATA);

  private studyService = inject(StudyService);
  private dialog = inject(Dialog);
  private toastService = inject(ToastService);
  private router = inject(Router);

  isOwner = false;
  canEdit = false;
  isSyncing = false;

  study = this.studyService.currentStudy;

  ngOnInit() {
    if (this.data) {
      this.isOwner = this.data.isOwner ?? false;
      this.canEdit = this.data.canEdit ?? false;
      this.isSyncing = this.data.isSyncing ?? false;
    }
  }

  addMember() {
    if (!this.isOwner) return;
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
    if (!this.isOwner) return;
    const s = this.study();
    if (!s) return;

    const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Remove member',
        message: 'Are you sure you want to remove this member? This action cannot be undone',
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
    if (!this.isOwner) return;
    this.studyService.updateCollaboratorPermission(this.study()!.id, userId, canEdit).subscribe({
      next: () => {
        const roleName = canEdit ? 'Collaborator' : 'Member';
        this.toastService.show(`Role updated to ${roleName}`, 'success');
        this.studyService.getStudy(this.study()!.id);
      }
    });
  }

  openSettings() {
    if (!this.isOwner) return;
    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<any>(StudySettingsDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: { name: s.name, visibility: s.visibility, engine_visibility: s.engine_visibility, export_visibility: s.export_visibility, category: s.category, orientation: s.orientation }
    });

    dialogRef.closed.subscribe((result) => {
      if (!result) return;
      if (result.action === 'save') {
        this.studyService.updateStudy(s.id, {
          name: result.name,
          visibility: result.visibility,
          engine_visibility: result.engine_visibility,
          export_visibility: result.export_visibility,
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
    if (!this.isOwner) return;
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
            this.dialogRef.close();
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
}
