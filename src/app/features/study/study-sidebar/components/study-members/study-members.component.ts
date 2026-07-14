import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroUser, heroTrash, heroPlus, heroHandRaised, heroXMark, heroKey } from '@ng-icons/heroicons/outline';
import { UserHovercardDirective } from '@shared/directives';
import { Study } from '../../../../../core/models/study.model';
import { StudyViewer } from '../../../../../core/services/study.service';

@Component({
  selector: 'app-study-members',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, UserHovercardDirective],
  providers: [
    provideIcons({
      heroUser,
      heroTrash,
      heroPlus,
      heroHandRaised,
      heroXMark,
      heroKey
    })
  ],
  templateUrl: './study-members.component.html'
})
export class StudyMembersComponent {
  study = input.required<Study | null>();
  isOwner = input.required<boolean>();
  viewers = input<StudyViewer[]>([]);
  isClassActive = input<boolean>(false);
  lockHolderId = input<string | null>(null);

  addMemberClicked = output<void>();
  removeMemberClicked = output<string>();
  permissionChanged = output<{ userId: string; canEdit: boolean }>();
  grantControlClicked = output<string>();
  revokeControlClicked = output<void>();

  addMember() {
    this.addMemberClicked.emit();
  }

  removeMember(uid: string) {
    this.removeMemberClicked.emit(uid);
  }

  toggleMemberPermission(uid: string, canEdit: boolean) {
    this.permissionChanged.emit({ userId: uid, canEdit });
  }

  grantControl(userId: string) {
    this.grantControlClicked.emit(userId);
  }

  revokeControl() {
    this.revokeControlClicked.emit();
  }
}
