import { Injectable, inject, signal, computed, effect, untracked, NgZone } from '@angular/core';
import { GameService } from './game.service';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Global service to manage the matchmaking queue state and events for Bughouse.
 * Uses reference-based socket event listeners to avoid wiping out other listeners
 * in components or other services.
 */
@Injectable({
  providedIn: 'root',
})
export class BughouseQueueService {
  private gameService = inject(GameService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private authService = inject(AuthService);

  isQueuing = signal<boolean>(false);
  queueTime = signal<number>(0);
  queueStatus = signal<string>('Searching for active teams...');
  partner = signal<{ name: string } | null>(null);

  formattedTime = computed(() => {
    const totalSecs = this.queueTime();
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  private queueInterval: any = null;

  constructor() {
    effect((onCleanup) => {
      const socket = this.gameService.socket();
      untracked(() => {
        if (socket) {
          socket.on('bughouse_lobby_sync', this.handleLobbySync);
          socket.on('bughouse_matched', this.handleMatched);
          socket.on('bughouse_game_start', this.handleGameStart);
          socket.on('bughouse_kicked', this.handleKicked);

          onCleanup(() => {
            socket.off('bughouse_lobby_sync', this.handleLobbySync);
            socket.off('bughouse_matched', this.handleMatched);
            socket.off('bughouse_game_start', this.handleGameStart);
            socket.off('bughouse_kicked', this.handleKicked);
          });
        }
      });
    });
  }

  private handleLobbySync = (lobby: any) => {
    this.ngZone.run(() => {
      if (!lobby) {
        this.isQueuing.set(false);
        this.stopQueueTimer();
        this.partner.set(null);
        return;
      }

      const myUser = this.authService.currentUser();
      const myUid = String(myUser?.uid);

      if (String(lobby.captain.userId) === myUid) {
        if (lobby.partner) {
          this.partner.set({ name: lobby.partner.userName });
        } else {
          this.partner.set(null);
        }
      } else if (lobby.partner && String(lobby.partner.userId) === myUid) {
        this.partner.set({ name: lobby.captain.userName });
      }

      if (lobby.status === 'waiting') {
        this.isQueuing.set(false);
        this.stopQueueTimer();
      } else if (lobby.status === 'queued') {
        this.isQueuing.set(true);
        this.startQueueTimer();
      } else if (lobby.status === 'matched') {
        this.isQueuing.set(false);
        this.stopQueueTimer();
        if (this.router.url.split('?')[0] !== '/bughouse') {
          this.router.navigate(['/bughouse']);
        }
      }
    });
  };

  private handleMatched = () => {
    this.ngZone.run(() => {
      this.isQueuing.set(false);
      this.stopQueueTimer();
      if (this.router.url.split('?')[0] !== '/bughouse') {
        this.router.navigate(['/bughouse']);
      }
    });
  };

  private handleGameStart = () => {
    this.ngZone.run(() => {
      this.isQueuing.set(false);
      this.stopQueueTimer();
      if (this.router.url.split('?')[0] !== '/bughouse') {
        this.router.navigate(['/bughouse']);
      }
    });
  };

  private handleKicked = () => {
    this.ngZone.run(() => {
      this.isQueuing.set(false);
      this.stopQueueTimer();
      this.partner.set(null);
    });
  };

  cancelQueue() {
    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_cancel_queue');
    }
    this.isQueuing.set(false);
    this.stopQueueTimer();
  }

  private startQueueTimer() {
    if (this.queueInterval) return;
    this.queueInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.queueTime.update((t) => t + 1);
        const time = this.queueTime();
        if (time < 2) {
          this.queueStatus.set('Searching for active teams...');
        } else if (time < 4) {
          this.queueStatus.set('Matching team players...');
        } else if (time < 6) {
          this.queueStatus.set('Found Opponent Team. Checking connection latencies...');
        } else {
          this.queueStatus.set('Connecting to match server...');
        }
      });
    }, 1000);
  }

  private stopQueueTimer() {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
    this.queueTime.set(0);
    this.queueStatus.set('Searching for active teams...');
  }
}
