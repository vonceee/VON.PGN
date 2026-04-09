import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject, Observable } from 'rxjs';

export interface LichessBroadcast {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  baseName?: string;
  description?: string;
  url: string;
  website?: string;
  tier?: number;
  status?: 'upcoming' | 'ongoing' | 'finished';
  image?: string;
  info?: {
    format?: string;
    tc?: string;
    fideTC?: string;
    location?: string;
    timeZone?: string;
    website?: string;
    standings?: string;
    players?: string;
  };
  dates?: number[];
  createdAt?: number;
}

export interface LiveGame {
  id: string;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  moves: string[];
  pgn: string;
  status: string;
}

interface BroadcastResponse {
  data: LichessBroadcast[];
  lichess: LichessBroadcast[];
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastService {
  private http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl;

  broadcasts = signal<LichessBroadcast[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  lastSyncTime = signal<Date | null>(null);
  
  liveGames = signal<LiveGame[]>([]);
  streamingActive = signal<string | null>(null);

  fetchBroadcasts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<BroadcastResponse>(`${this.apiUrl}/broadcasts`).subscribe({
      next: (res) => {
        const allBroadcasts = [
          ...(res.data || []),
          ...(res.lichess || [])
        ];
        
        const merged = allBroadcasts.sort((a, b) => {
          const statusOrder = { ongoing: 0, upcoming: 1, finished: 2 };
          return (statusOrder[a.status as keyof typeof statusOrder] ?? 3) 
               - (statusOrder[b.status as keyof typeof statusOrder] ?? 3);
        });
        
        this.broadcasts.set(merged);
        this.lastSyncTime.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load broadcasts:', err);
        this.error.set(err.error?.message || 'Failed to load broadcasts');
        this.loading.set(false);
      }
    });
  }

  getBroadcast(identifier: string) {
    return this.http.get<any>(`${this.apiUrl}/broadcasts/${identifier}`);
  }

  getLivePgn(broadcastId: string) {
    return this.http.get<{ broadcast_id: string; pgn: string; synced_at: string }>(
      `${this.apiUrl}/broadcasts/${broadcastId}/live`
    );
  }

  getBroadcastDetail(broadcastId: string) {
    return this.http.get<any>(`${this.apiUrl}/broadcasts/${broadcastId}`);
  }

  getRoundPgn(roundId: string) {
    return this.http.get(`${this.apiUrl}/broadcasts/round/${roundId}/pgn`, {
      responseType: 'text'
    });
  }

  getLeaderboard(broadcastId: string) {
    return this.http.get<any>(`${this.apiUrl}/broadcasts/${broadcastId}/leaderboard`);
  }

  streamLiveGames(broadcastId: string): Observable<LiveGame> {
    const subject = new Subject<LiveGame>();
    const eventSource = new EventSource(
      `${this.apiUrl}/broadcasts/${broadcastId}/stream`
    );

    eventSource.addEventListener('game', (event: any) => {
      try {
        const game = JSON.parse(event.data);
        subject.next(game);
      } catch (e) {
        console.error('Failed to parse game data', e);
      }
    });

    eventSource.addEventListener('error', () => {
      eventSource.close();
      subject.complete();
    });

    return subject;
  }

  stopStreaming(): void {
    this.streamingActive.set(null);
    this.liveGames.set([]);
  }

  fetchAllBroadcastsRaw() {
    return this.http.get<any>(`${this.apiUrl}/broadcasts?include_all=true`);
  }
}