import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '@shared/ui';
import { UserHovercardDirective } from '@shared/directives';
import { StudyService, StudyViewer } from '../../../../core/services/study.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-viewers-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent, UserHovercardDirective],
  template: `
    <div class="bg-main rounded-4xl w-[90vw] max-w-sm p-8 space-y-6 relative">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl text-content">
          Players in the lobby
        </h2>
      </div>

      <!-- Body Content -->
      <div class="space-y-4">
        <div class="max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
          @for (viewer of data.viewers; track getViewerKey(viewer)) {
            <div class="w-full flex items-center justify-between p-2.5 px-4 rounded-xl hover:bg-surface group">
              <div class="flex items-center gap-2 overflow-hidden flex-1">
                <span 
                  class="text-sm font-semibold text-content group-hover:text-accent cursor-pointer truncate"
                  [appUserHovercard]="getViewerName(viewer)"
                >{{ getViewerName(viewer) }}</span>

                @if (isStudyViewer(viewer) && isLockHolder(viewer)) {
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                    Chalk
                  </span>
                }
              </div>

              @if (isStudyViewer(viewer) && showPassChalk(viewer)) {
                <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  @if (isLockHolder(viewer)) {
                    <button 
                      appButton 
                      variant="danger" 
                      class="!px-2.5 !py-1 !text-xs!font-bold"
                      (click)="revokeChalk()"
                    >
                      Revoke
                    </button>
                  } @else {
                    <button 
                      appButton 
                      variant="primary" 
                      class="!px-2.5 !py-1 !text-xs!font-bold"
                      (click)="passChalk(viewer.userId)"
                    >
                      Pass Chalk
                    </button>
                  }
                </div>
              }
            </div>
          } @empty {
            <div class="text-center py-6 text-sm text-muted">
              No other players in the lobby
            </div>
          }
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="pt-2 flex gap-4 w-full">
        <button appButton variant="outline" class="flex-1" (click)="dialogRef.close()">
          Close
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 10px;
    }
    :host ::ng-deep .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--accent);
    }
  `]
})
export class ViewersDialogComponent {
  dialogRef = inject(DialogRef);
  data = inject<{ viewers: Array<string | StudyViewer>, count: number }>(DIALOG_DATA);

  private studyService = inject(StudyService, { optional: true });
  private authService = inject(AuthService, { optional: true });

  isClassActive = computed(() => this.studyService?.isClassActive() ?? false);
  lockHolderId = computed(() => this.studyService?.lockHolderId() ?? null);

  isOwner = computed(() => {
    if (!this.authService || !this.studyService) return false;
    const user = this.authService.currentUser();
    const s = this.studyService.currentStudy();
    if (!user || !s) return false;
    const myUid = user.uid || user.id;
    const studyOwnerId = s.user_id || (s as any).userId || s.owner?.id;
    return !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));
  });

  isStudyViewer(viewer: any): viewer is StudyViewer {
    return viewer && typeof viewer === 'object' && 'userId' in viewer;
  }

  getViewerKey(viewer: string | StudyViewer): string {
    return this.isStudyViewer(viewer) ? viewer.userId : viewer;
  }

  getViewerName(viewer: string | StudyViewer): string {
    return this.isStudyViewer(viewer) ? viewer.userName : viewer;
  }

  isLockHolder(viewer: StudyViewer): boolean {
    return String(viewer.userId) === String(this.lockHolderId());
  }

  showPassChalk(viewer: StudyViewer): boolean {
    if (!this.isOwner() || !this.isClassActive()) return false;
    const user = this.authService?.currentUser();
    const myUid = user?.uid || user?.id;
    return !!(myUid && String(viewer.userId) !== String(myUid));
  }

  passChalk(userId: string) {
    this.studyService?.grantBoardControl(userId);
  }

  revokeChalk() {
    this.studyService?.revokeBoardControl();
  }
}

