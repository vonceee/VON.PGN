import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Tournament, TournamentStatus } from '../models/tournament.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  tournaments = signal<Tournament[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  fetchTournaments(status?: string): void {
    this.loading.set(true);
    this.error.set(null);

    const url = status
      ? `${this.apiUrl}/tournaments?status=${status}`
      : `${this.apiUrl}/tournaments`;

    this.http.get<{ data: Tournament[] }>(url).subscribe({
      next: (res) => {
        this.tournaments.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load tournaments');
        this.loading.set(false);
      }
    });
  }

  fetchTournament(slug: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<{ data: Tournament }>(`${this.apiUrl}/tournaments/${slug}`).subscribe({
      next: (res) => {
        const current = this.tournaments();
        const idx = current.findIndex(t => t.id === slug);
        if (idx !== -1) {
          current[idx] = res.data;
          this.tournaments.set([...current]);
        } else {
          this.tournaments.update(list => [...list, res.data]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load tournament');
        this.loading.set(false);
      }
    });
  }

  getTournamentById(id: string): Tournament | undefined {
    return this.tournaments().find(t => t.id === id);
  }

  getByStatus(status: TournamentStatus): Tournament[] {
    return this.tournaments().filter(t => t.status === status);
  }
}
