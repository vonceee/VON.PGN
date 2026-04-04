import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface LichessBroadcast {
  id: string;
  slug: string;
  name: string;
  description?: string;
  url: string;
  tier?: number;
  createdAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  lichessBroadcasts = signal<LichessBroadcast[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  fetchBroadcasts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<{ data: any[]; lichess: LichessBroadcast[] }>(`${this.apiUrl}/broadcasts`).subscribe({
      next: (res) => {
        this.lichessBroadcasts.set(res.lichess || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load broadcasts:', err);
        this.error.set(err.message || 'Failed to load broadcasts');
        this.loading.set(false);
      }
    });
  }
}
