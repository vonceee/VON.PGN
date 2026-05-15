import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameService } from './game.service';
import { environment } from '../../../environments/environment';
import { catchError, map, of } from 'rxjs';

export interface PresenceUpdate {
  userId: string;
  online: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private http = inject(HttpClient);
  private gameService = inject(GameService);
  private microserviceUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';

  // State: userId -> isOnline
  private presenceMap = signal<Map<string, boolean>>(new Map());
  private pendingFetches = new Set<string>();

  // Global Site Stats
  nbPlayers = signal<number>(0);
  nbGames = signal<number>(0);
  topGames = signal<any[]>([]);
  topGameId = signal<string | null>(null);

  constructor() {
    // Sync with socket events from GameService
    effect(() => {
      const socket = this.gameService.socket();
      untracked(() => {
        if (socket) {
          // Clean up any existing listener to prevent leaks
          socket.off('presence_update');
          socket.on('presence_update', (data: PresenceUpdate) => {
            this.updateLocalPresence(data.userId, data.online);
          });

          socket.on('site_stats', (data: { nbPlayers: number, nbGames: number, topGames?: any[], topGameId?: string }) => {
            this.nbPlayers.set(data.nbPlayers);
            this.nbGames.set(data.nbGames);
            if (data.topGames) this.topGames.set(data.topGames);
            if (data.topGameId) this.topGameId.set(data.topGameId);
          });
        }
      });
    });
  }

  /**
   * Get the online status of a user from the local cache.
   */
  getPresence(userId: string): boolean {
    return this.presenceMap().get(userId) || false;
  }

  /**
   * Explicitly fetch presence for a user
   */
  fetchPresence(userId: string): void {
    const isPending = this.pendingFetches.has(userId);
    const inMap = untracked(() => this.presenceMap().has(userId));
    
    if (isPending || inMap) return;
    
    this.pendingFetches.add(userId);
    this.http.get<{ online: boolean }>(`${this.microserviceUrl}/api/presence/${userId}`)
      .pipe(
        catchError(() => of({ online: false }))
      )
      .subscribe(res => {
        this.updateLocalPresence(userId, res.online);
        this.pendingFetches.delete(userId);
      });
  }

  /**
   * Bulk fetch presence for multiple users
   */
  fetchBulkPresence(userIds: string[]): void {
    if (userIds.length === 0) return;
    
    this.http.post<{ statuses: Record<string, boolean> }>(`${this.microserviceUrl}/api/presence/bulk`, { userIds })
      .pipe(
        catchError(() => of({ statuses: {} }))
      )
      .subscribe(res => {
        Object.entries(res.statuses).forEach(([userId, online]) => {
          this.updateLocalPresence(userId, online);
        });
      });
  }

  private updateLocalPresence(userId: string, online: boolean): void {
    const current = untracked(() => this.presenceMap().get(userId));
    if (current === online) return;

    this.presenceMap.update(prev => {
      const next = new Map(prev);
      next.set(userId, online);
      return next;
    });
  }

  /**
   * Subscribe to global site statistics (players online, games in play)
   */
  subscribeToSiteStats(): void {
    const socket = this.gameService.socket();
    if (socket) {
      socket.emit('subscribe_site_stats');
    }
  }

  /**
   * Unsubscribe from global site statistics
   */
  unsubscribeFromSiteStats(): void {
    const socket = this.gameService.socket();
    if (socket) {
      socket.emit('unsubscribe_site_stats');
    }
  }
}
