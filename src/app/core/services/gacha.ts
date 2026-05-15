import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable, tap, of, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface CollectiblePlayer {
  id: number;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  title?: string;
  peak_rating?: number;
  bio?: string;
  image_url?: string;
  stats?: any;
}

export interface UserCollectible {
  id: number;
  user_id: number;
  collectible_player_id: number;
  count: number;
  collectible_player: CollectiblePlayer;
}

export interface PullResponse {
  success: boolean;
  results: CollectiblePlayer[];
  remaining_packs: number;
}

@Injectable({
  providedIn: 'root'
})
export class GachaService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/gacha`;

  public dailyPacks = signal<number>(0);
  public collection = signal<UserCollectible[]>([]);
  public isLoading = signal<boolean>(false);

  loadPacks(packs: number) {
    this.dailyPacks.set(packs);
  }

  getPlayers(): Observable<CollectiblePlayer[]> {
    return this.http.get<{ players: CollectiblePlayer[], packs_available: number }>(`${this.apiUrl}/players`).pipe(
      tap(res => {
        this.dailyPacks.set(res.packs_available);
      }),
      map(res => res.players)
    );
  }

  getCollection(): Observable<UserCollectible[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    this.isLoading.set(true);
    return this.http.get<UserCollectible[]>(`${this.apiUrl}/collection`).pipe(
      tap(collection => {
        this.collection.set(collection);
        this.isLoading.set(false);
      })
    );
  }

  pull(count: 1 | 10): Observable<PullResponse> {
    return this.http.post<PullResponse>(`${this.apiUrl}/pull`, { count }).pipe(
      tap(response => {
        if (response.success) {
          this.dailyPacks.set(response.remaining_packs);
          // Refresh collection after pull
          this.getCollection().subscribe();
        }
      })
    );
  }
}
