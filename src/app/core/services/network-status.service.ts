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

  // Tracks if the database (Supabase) is offline
  databaseOffline = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkStatus());
      window.addEventListener('offline', () => this.checkStatus());

      // Watch GameService's socket status reactively
      effect(() => {
        const isSocketConnected = this.gameService.isConnected();
        untracked(() => {
          this.checkStatus(isSocketConnected);
        });
      });
    }
  }

  /**
   * Sets the database offline status.
   */
  setDatabaseOffline(isOffline: boolean): void {
    if (isOffline !== this.databaseOffline()) {
      this.databaseOffline.set(isOffline);
    }
  }

  /**
   * Evaluates the current browser and socket status to derive the unified network state.
   */
  private checkStatus(isSocketConnected: boolean = this.gameService.isConnected()): void {
    if (!navigator.onLine) {
      this.networkState.set('offline');
      this.wasOffline.set(true);
    } else if (!isSocketConnected) {
      this.networkState.set('reconnecting');
      this.wasOffline.set(true);
    } else {
      this.networkState.set('online');
    }
  }
}
