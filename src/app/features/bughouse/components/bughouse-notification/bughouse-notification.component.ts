import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCheckCircle, heroXCircle, heroInformationCircle } from '@ng-icons/heroicons/outline';
import { BughouseGameStateService } from '../../services/bughouse-game-state.service';

/**
 * Bughouse Notification Banner Component.
 *
 * WHY: Decouples temporary toast alert rendering (invite popups, game warnings, system messages)
 *      from top-level bughouse routing and view containers.
 */
@Component({
  selector: 'app-bughouse-notification',
  standalone: true,
  imports: [CommonModule, NgIcon],
  providers: [
    provideIcons({
      heroCheckCircle,
      heroXCircle,
      heroInformationCircle,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-notification.component.html',
})
export class BughouseNotificationComponent {
  public gameStateService = inject(BughouseGameStateService);
}
