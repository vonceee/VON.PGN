import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { BughouseInviteService } from '../../core/services/bughouse-invite.service';
import { BughouseGameStateService } from './services/bughouse-game-state.service';

import { BughouseLobbyComponent } from './components/bughouse-lobby/bughouse-lobby.component';
import { BughousePlayComponent } from './components/bughouse-play/bughouse-play.component';
import { BughouseQueueComponent } from './components/bughouse-queue/bughouse-queue.component';
import { BughouseNotificationComponent } from './components/bughouse-notification/bughouse-notification.component';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

/**
 * Controller Component for the Bughouse chess page.
 *
 * WHY: Streamlined top-level routing container that delegates lobby orchestration,
 *      active dual-board gameplay, queue tracking, and toast alerts to dedicated
 *      modular subcomponents.
 */
@Component({
  selector: 'app-bughouse',
  standalone: true,
  imports: [
    CommonModule,
    BughouseLobbyComponent,
    BughousePlayComponent,
    BughouseQueueComponent,
    BughouseNotificationComponent,
    FloatingCursorContainerDirective,
    FloatingCursorComponent,
  ],
  host: {
    class: 'absolute inset-0 overflow-hidden flex flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse.component.html',
  styleUrls: ['./bughouse.component.css'],
})
export class BughouseComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private route = inject(ActivatedRoute);

  // Injected Services
  bughouseInviteService = inject(BughouseInviteService);
  gameStateService = inject(BughouseGameStateService);

  ngOnInit() {
    this.gameStateService.resetGame();

    // Read query parameters for incoming invite details
    this.route.queryParams.subscribe((params) => {
      const inviteId = params['inviteId'];
      const sender = params['sender'];
      const senderId = params['senderId'];

      if (inviteId && sender && senderId) {
        this.ngZone.run(() => {
          const exists = this.bughouseInviteService
            .incomingInvites()
            .some((i) => i.id === senderId);
          if (!exists) {
            this.bughouseInviteService.incomingInvites.update((list) => [
              ...list,
              { id: senderId, sender },
            ]);
            this.gameStateService.showNotification(
              `Incoming lobby invitation from ${sender}!`,
              'info',
            );
          }
        });
      }
    });
  }

  ngOnDestroy() {
    this.gameStateService.stopClocks();
  }
}
