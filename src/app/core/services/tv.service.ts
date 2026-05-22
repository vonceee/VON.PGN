import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CanvasGame {
  gameId?: string;
  white?: { name?: string, rating?: number };
  black?: { name?: string, rating?: number };
  score?: number;
  fen?: string;
  turn?: string;
  whiteTimeRemainingMs?: number;
  blackTimeRemainingMs?: number;
  serverTimestamp?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TvService implements OnDestroy {
  private http = inject(HttpClient);
  private microserviceUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';
  
  ongoingGames = signal<CanvasGame[]>([]);
  private pollInterval: any;

  startPollingGames(): void {
    this.fetchGames();
    this.pollInterval = setInterval(() => this.fetchGames(), 5000);
  }

  stopPollingGames(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private fetchGames(): void {
    this.http.get<{ games: CanvasGame[] }>(`${this.microserviceUrl}/api/active/all`)
      .subscribe({
        next: (res) => this.ongoingGames.set(res.games || []),
        error: (err) => console.error('[TV Service] Error fetching active games', err)
      });
  }

  ngOnDestroy(): void {
    this.stopPollingGames();
  }
}
