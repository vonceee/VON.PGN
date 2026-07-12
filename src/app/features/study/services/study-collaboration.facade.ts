import {
  Injectable,
  inject,
  signal,
  effect,
  PLATFORM_ID,
  NgZone,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { WebrtcService } from '../../../core/services/webrtc.service';
import { StudyNavigationFacade } from './study-navigation.facade';

import { ReceiveRequestDialogComponent } from '../dialogs/receive-request-dialog/receive-request-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class StudyCollaborationFacade {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private dialog = inject(Dialog);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);
  private webrtc = inject(WebrtcService);
  private nav = inject(StudyNavigationFacade);

  // Classroom duration timer states
  classDuration = signal<string>('00:00');
  private classTimerId: any = null;

  // Dialog & loading states
  showDeleteModal = signal(false);
  showStartClassDialog = signal(false);
  showEndClassDialog = signal(false);
  showJoinClassDialog = signal(false);
  isDeleting = signal(false);

  // Delegates
  classStartedAt = this.studyService.classStartedAt;
  isClassActive = this.studyService.isClassActive;
  hasJoinedClass = this.studyService.hasJoinedClass;
  lockHolderId = this.studyService.lockHolderId;
  hasBoardControl = this.studyService.hasBoardControl;
  study = this.studyService.currentStudy;
  isOwner = this.studyService.isOwner;

  constructor() {
    this.setupEffects();
    this.setupSubscriptions();
  }

  private setupEffects() {
    effect(() => {
      const startedAt = this.classStartedAt();
      const isBrowser = isPlatformBrowser(this.platformId);

      if (this.classTimerId) {
        clearInterval(this.classTimerId);
        this.classTimerId = null;
      }

      if (isBrowser && startedAt) {
        const updateTimer = () => {
          const start = new Date(startedAt).getTime();
          const now = Date.now();
          const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
          const hours = Math.floor(diffSeconds / 3600);
          const minutes = Math.floor((diffSeconds % 3600) / 60);
          const seconds = diffSeconds % 60;

          if (hours > 0) {
            this.classDuration.set(
              `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
          } else {
            this.classDuration.set(
              `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
          }
        };

        updateTimer();
        this.ngZone.runOutsideAngular(() => {
          this.classTimerId = setInterval(() => {
            this.ngZone.run(() => {
              updateTimer();
            });
          }, 1000);
        });
      } else {
        this.classDuration.set('00:00');
      }
    });

    effect(() => {
      const active = this.isClassActive();
      const isOwner = this.isOwner();
      if (active && !isOwner) {
        this.ngZone.run(() => {
          this.showJoinClassDialog.set(true);
        });
      }
    });
  }

  private setupSubscriptions() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Listen for incoming move permission requests (Tutor side)
    this.studyService.onMovePermissionRequested$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (this.isOwner()) {
          this.ngZone.run(() => {
            const dialogRef = this.dialog.open<'grant' | 'decline'>(
              ReceiveRequestDialogComponent,
              {
                width: '450px',
                maxWidth: '90vw',
                data: { userName: payload.userName },
                backdropClass: ['bg-black/50'],
                disableClose: true,
              }
            );

            dialogRef.closed.subscribe((action) => {
              if (action === 'grant') {
                this.studyService.grantBoardControl(payload.userId);
              } else if (action === 'decline') {
                this.studyService.declineMovePermission(payload.userId);
              }
            });
          });
        }
      });

    // Listen for declined move permission requests (Student side)
    this.studyService.onMovePermissionDeclined$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        const user = this.authService.currentUser();
        const myUid = String(user?.uid || user?.id || '');
        if (String(payload.targetUserId) === myUid) {
          this.toastService.show('Your tutor declined the move request.', 'error');
        }
      });
  }

  toggleClassSession() {
    if (this.isClassActive()) {
      this.showEndClassDialog.set(true);
      return;
    }
    this.showStartClassDialog.set(true);
  }

  onStartClassConfirmed() {
    this.showStartClassDialog.set(false);
    this.studyService.startClass();
  }

  onStartClassCancelled() {
    this.showStartClassDialog.set(false);
  }

  onEndClassConfirmed() {
    this.showEndClassDialog.set(false);
    this.studyService.endClass();
  }

  onEndClassCancelled() {
    this.showEndClassDialog.set(false);
  }

  joinClassSession() {
    this.studyService.hasJoinedClass.set(true);
    this.toastService.show('Joined live classroom session!', 'success');
  }

  onJoinClassConfirmed() {
    this.showJoinClassDialog.set(false);
    this.joinClassSession();
  }

  onJoinClassCancelled() {
    this.showJoinClassDialog.set(false);
    this.toastService.show('Exploring freely. You can join the class anytime using the banner.');
  }

  toggleSync() {
    this.nav.isSyncing.update((v) => !v);
    if (this.nav.isSyncing()) {
      // Trigger sync logic on navigation facade
      const remote = this.studyService.lastRemoteState();
      if (remote.chapterId) {
        this.nav.updateCurrentPosition(null); // Fallback updates are handled in nav's effect
      }
    }
  }

  onDeleteConfirmed(onSuccess: () => void) {
    if (!this.study()) return;
    this.isDeleting.set(true);
    this.studyService.deleteStudy(this.study()!.id).subscribe({
      next: () => {
        onSuccess();
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
      },
      error: () => this.isDeleting.set(false),
    });
  }

  cleanup() {
    this.webrtc.leaveCall();
    if (this.classTimerId) {
      clearInterval(this.classTimerId);
      this.classTimerId = null;
    }
  }
}
