import { Component, inject, signal, effect } from '@angular/core';
import { NetworkStatusService } from '../../../../core/services/network-status.service';

/**
 * Component that displays a global Lichess-style network connection status alert.
 * 
 * WHY: Warns the user when they lose internet connection or the server connection drops.
 *      Transitions smoothly from the bottom left using Tailwind classes.
 * 
 * ASSUMPTIONS & EDGE CASES:
 * - When transitioning from offline back to online, it stays green ("Connected") for 2 seconds,
 *   then auto-dismisses itself and resets the historic 'wasOffline' state.
 * - Managed completely with Signals for change-detection efficiency.
 */
@Component({
  selector: 'app-network-status',
  standalone: true,
  templateUrl: './network-status.component.html',
  styleUrl: './network-status.component.css'
})
export class NetworkStatusComponent {
  private networkService = inject(NetworkStatusService);

  state = this.networkService.networkState;
  wasOffline = this.networkService.wasOffline;

  // Local visibility state to handle timed auto-dismissals on successful reconnection
  isVisible = signal(false);
  private dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const currentState = this.state();
      const hasBeenOffline = this.wasOffline();

      if (currentState === 'offline' || currentState === 'reconnecting') {
        if (this.dismissTimeout) {
          clearTimeout(this.dismissTimeout);
          this.dismissTimeout = null;
        }
        this.isVisible.set(true);
      } else if (currentState === 'online') {
        if (hasBeenOffline) {
          // TRADEOFF: Keep showing success state for 2 seconds to reassure the user they are connected.
          this.dismissTimeout = setTimeout(() => {
            this.isVisible.set(false);
            
            // Wait for slide-down transition to finish before resetting the session wasOffline state
            setTimeout(() => {
              this.networkService.wasOffline.set(false);
            }, 500);
          }, 2000);
        } else {
          this.isVisible.set(false);
        }
      }
    });
  }
}
