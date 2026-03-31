import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Tournament, TournamentStatus } from '../models/tournament.model';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';

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

    this.http.get<{ data: Tournament; is_bookmarked?: boolean }>(`${this.apiUrl}/tournaments/${slug}`).subscribe({
      next: (res) => {
        const tournament = { ...res.data, isBookmarked: res.is_bookmarked ?? false };
        const current = this.tournaments();
        const idx = current.findIndex(t => t.id === slug);
        if (idx !== -1) {
          current[idx] = tournament;
          this.tournaments.set([...current]);
        } else {
          this.tournaments.update(list => [...list, tournament]);
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

  // User-level CRUD
  getMyTournaments(): Observable<Tournament[]> {
    return this.http.get<{ data: Tournament[] }>(`${this.apiUrl}/my/tournaments`)
      .pipe(map(res => res.data));
  }

  getMyTournament(id: string): Observable<Tournament> {
    return this.http.get<{ data: Tournament }>(`${this.apiUrl}/my/tournaments/${id}`)
      .pipe(map(res => res.data));
  }

  createMyTournament(data: any): Observable<Tournament> {
    return this.http.post<{ data: Tournament }>(`${this.apiUrl}/my/tournaments`, data)
      .pipe(map(res => res.data));
  }

  updateMyTournament(id: string, data: any): Observable<Tournament> {
    return this.http.put<{ data: Tournament }>(`${this.apiUrl}/my/tournaments/${id}`, data)
      .pipe(map(res => res.data));
  }

  deleteMyTournament(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/my/tournaments/${id}`);
  }

  toggleBookmark(slug: string): Observable<{ is_bookmarked: boolean; message: string }> {
    return this.http.post<{ is_bookmarked: boolean; message: string }>(
      `${this.apiUrl}/tournaments/${slug}/bookmark`, {}
    );
  }

  getBookmarkedTournaments(): Observable<Tournament[]> {
    return this.http.get<{ data: Tournament[] }>(`${this.apiUrl}/tournaments/bookmarks`)
      .pipe(map(res => res.data));
  }

  getUserTournaments(userId: string): Observable<Tournament[]> {
    return this.http.get<{ data: Tournament[] }>(`${this.apiUrl}/users/${userId}/tournaments`)
      .pipe(map(res => res.data));
  }
}
