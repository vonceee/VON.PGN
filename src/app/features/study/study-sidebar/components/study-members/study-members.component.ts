import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroUserPlus,
  heroMagnifyingGlass,
  heroTrash,
  heroXMark,
  heroKey,
  heroUser
} from '@ng-icons/heroicons/outline';
import { UserHovercardDirective } from '@shared/directives';
import { Study } from '../../../../../core/models/study.model';
import { StudyViewer } from '../../../../../core/services/study-socket.service';

/**
 * Study Members Sidebar Component.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Implements a modern, minimalist member management layout mirroring the reference card
 * design: a top header with live member count badge and invite action, an integrated
 * search bar with real-time filtering, and categorized sections for Owner, Collaborators,
 * and Lobby viewers without visual clutter.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Real-time websocket viewers and persistent collaborators are tracked independently.
 * - Total count represents the distinct sum of active roles displayed in the sections.
 * - Search query filters across all sections simultaneously with safe null handling.
 */
@Component({
  selector: 'app-study-members',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, UserHovercardDirective],
  providers: [
    provideIcons({
      heroUserPlus,
      heroMagnifyingGlass,
      heroTrash,
      heroXMark,
      heroKey,
      heroUser
    })
  ],
  templateUrl: './study-members.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-1 flex flex-col min-h-0 min-w-0'
  }
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
    return collabs.filter(c => (c.username || '').toLowerCase().includes(q));
  });

  filteredViewers = computed(() => {
    const vList = this.viewers();
    const q = this.normalizedQuery();
    if (!q) return vList;
    return vList.filter(v => (v.userName || '').toLowerCase().includes(q));
  });

  totalCount = computed(() => {
    const ownerCount = this.study()?.owner ? 1 : 0;
    const collabCount = this.study()?.collaborators?.length || 0;
    const viewerCount = this.viewers().length;
    return ownerCount + collabCount + viewerCount;
  });

  clearSearch(): void {
    this.searchQuery.set('');
  }

  addMember(): void {
    this.addMemberClicked.emit();
  }

  removeMember(uid: string): void {
    this.removeMemberClicked.emit(uid);
  }

  toggleMemberPermission(uid: string, canEdit: boolean): void {
    this.permissionChanged.emit({ userId: uid, canEdit });
  }

  grantControl(userId: string): void {
    this.grantControlClicked.emit(userId);
  }

  revokeControl(): void {
    this.revokeControlClicked.emit();
  }
}
