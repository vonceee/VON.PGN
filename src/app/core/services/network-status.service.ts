import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GameService } from './game.service';

export type NetworkState = 'online' | 'offline' | 'reconnecting';

/**
 * Monitors and orchestrates the client's network connectivity status.
 * 
 * WHY: Replicates Lichess's connection loss warnings (red/orange banner below the screen).
 *      Allows user to know if they lost internet or if they lost connection to our WebSocket microservice.
 * 
 * ALTERNATIVES CONSIDERED:
 * - Direct subscription to Socket.io events inside the component: Rejected because we want a 
 *   single source of truth service that components, interceptors, or routing can query.
 * 
 * ASSUMPTIONS & EDGE CASES:
 * - Assumes the host environment supports standard `window` and `navigator` objects (Browser platform).
 * - Safe for Server-Side Rendering (SSR) via conditional execution.
 * - Handles the case where the browser claims to be online, but the socket server itself is dead.
 * - Uses a 5-second grace period for the initial socket connection to avoid a brief "Reconnecting" banner on startup.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private gameService = inject(GameService);

  // The visual state of the client's network
  networkState = signal<NetworkState>('online');

  // Tracks if the user has been offline during this app session, to determine if they need a "Connected" success flash
  wasOffline = signal<boolean>(false);

  // Track if we have established a socket connection at least once during the current session
  private hasConnectedOnce = false;

  // Grace period timer for initial connection
  private connectionGraceTimer: any = null;
  private isGracePeriodActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkStatus());
      window.addEventListener('offline', () => this.checkStatus());

      // Watch GameService's socket status reactively
      effect(() => {
        const isSocketConnected = this.gameService.isConnected();
        const socket = this.gameService.socket();
        untracked(() => {
          this.handleSocketChange(socket, isSocketConnected);
        });
      });
    }
  }

  /**
   * Responds to changes in socket connection state.
   */
  private handleSocketChange(socket: any, isSocketConnected: boolean): void {
    if (!socket) {
      // Clear any state/timers when there is no active socket connection (logout or unauthenticated)
      this.clearGraceTimer();
      this.hasConnectedOnce = false;
      this.checkStatus();
      return;
    }

    if (isSocketConnected) {
      this.clearGraceTimer();
      this.hasConnectedOnce = true;
      this.checkStatus();
    } else {
      if (this.hasConnectedOnce) {
        this.checkStatus();
      } else if (!this.isGracePeriodActive) {
        // Start grace period on first attempt
        this.isGracePeriodActive = true;
        this.checkStatus(); // Should be online because isGracePeriodActive is true
        
        this.connectionGraceTimer = setTimeout(() => {
          this.isGracePeriodActive = false;
          this.checkStatus(); // If still disconnected, will become reconnecting
        }, 5000);
      }
    }
  }

  private clearGraceTimer(): void {
    if (this.connectionGraceTimer) {
      clearTimeout(this.connectionGraceTimer);
      this.connectionGraceTimer = null;
    }
    this.isGracePeriodActive = false;
  }

  /**
   * Evaluates the current browser and socket status to derive the unified network state.
   */
  private checkStatus(): void {
    const isOnline = navigator.onLine;
    const socket = this.gameService.socket();
    const isSocketConnected = this.gameService.isConnected();

    if (!isOnline) {
      this.networkState.set('offline');
      this.wasOffline.set(true);
    } else if (socket !== null && !isSocketConnected && !this.isGracePeriodActive) {
      this.networkState.set('reconnecting');
      this.wasOffline.set(true);
    } else {
      this.networkState.set('online');
    }
  }
}
