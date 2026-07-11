import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroUser, heroTrash, heroPlus } from '@ng-icons/heroicons/outline';
import { UserHovercardDirective } from '@shared/directives';
import { Study } from '../../../../../core/models/study.model';

@Component({
  selector: 'app-study-members',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, UserHovercardDirective],
  providers: [
    provideIcons({
      heroUser,
      heroTrash,
      heroPlus
    })
  ],
  template: `
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden bg-main select-none p-4 rounded-lg">
      <div class="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
        <!-- Owner -->
        <div class="flex items-center justify-between p-2.5 px-4 rounded-4xl bg-subtle">
          <div class="flex items-center gap-4 min-w-0">
            <div
              class="w-8 h-8 rounded-full bg-main border border-border-base/50 flex items-center justify-center text-muted shrink-0">
              <ng-icon name="heroUser" class="text-sm"></ng-icon>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium cursor-pointer hover:underline hover:text-accent truncate text-content"
                [appUserHovercard]="study()?.owner?.name || ''">
                {{ study()?.owner?.name }}
              </span>
              <span class="text-xs text-muted font-medium mt-0.5">Owner</span>
            </div>
          </div>
        </div>

        <!-- Collaborators/Members List -->
        @for (collab of study()?.collaborators; track collab.uid) {
        <div
          class="flex items-center justify-between p-2.5 px-4 rounded-4xl bg-subtle border border-border-base/5 hover:border-border-base/30 transition-all">
          <div class="flex items-center gap-4 min-w-0">
            <div
              class="w-8 h-8 rounded-full bg-main border border-border-base/50 flex items-center justify-center text-muted shrink-0">
              <ng-icon name="heroUser" class="text-sm"></ng-icon>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium cursor-pointer hover:underline hover:text-accent truncate text-content"
                [appUserHovercard]="collab.username">
                {{ collab.username }}
              </span>
              <span class="text-xs text-muted font-medium mt-0.5">{{ collab.can_edit ? 'Collaborator' : 'Member' }}</span>
            </div>
          </div>

          @if (isOwner()) {
          <div class="flex items-center gap-2 shrink-0">
            <!-- Role selection dropdown -->
            <div class="relative min-w-[105px]">
              <select [ngModel]="collab.can_edit ? 'collaborator' : 'member'"
                (ngModelChange)="toggleMemberPermission(collab.uid, $event === 'collaborator')"
                class="w-full px-2.5 py-1 bg-main border border-border-base rounded-full text-xs font-medium outline-none cursor-pointer appearance-none pr-7 focus:border-accent focus:ring-1 focus:ring-accent transition-all">
                <option value="member">Member</option>
                <option value="collaborator">Collaborator</option>
              </select>
              <div class="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-muted">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            <button (click)="removeMember(collab.uid)"
              class="p-1.5 rounded-full transition-colors cursor-pointer text-muted hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center animate-none"
              title="Remove member">
              <ng-icon name="heroTrash" class="text-md"></ng-icon>
            </button>
          </div>
          }
        </div>
        } @empty {
        @if (!isOwner()) {
        <div class="text-center py-4 text-xs text-muted">No other members.</div>
        }
        }

        @if (isOwner()) {
        <button (click)="addMember()"
          class="w-full flex items-center justify-center py-3.5 px-4 rounded-4xl bg-subtle border border-dashed cursor-pointer">
          <ng-icon name="heroPlus" class="text-lg"></ng-icon>
        </button>
        }
      </div>
    </div>
  `
})
export class StudyMembersComponent {
  study = input.required<Study | null>();
  isOwner = input.required<boolean>();

  addMemberClicked = output<void>();
  removeMemberClicked = output<string>();
  permissionChanged = output<{ userId: string; canEdit: boolean }>();

  addMember() {
    this.addMemberClicked.emit();
  }

  removeMember(uid: string) {
    this.removeMemberClicked.emit(uid);
  }

  toggleMemberPermission(uid: string, canEdit: boolean) {
    this.permissionChanged.emit({ userId: uid, canEdit });
  }
}
