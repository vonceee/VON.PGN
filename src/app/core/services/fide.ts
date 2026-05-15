import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FideFederation {
  code: string;
  name: string;
  alpha2: string;
  player_count: number;
}

export interface FidePlayer {
  fide_id: number;
  name: string;
  federation_code: string;
  title: string;
  rating_standard: number;
  rating_rapid: number;
  rating_blitz: number;
  birth_year: number;
  is_active: boolean;
  federation?: FideFederation;
}

export interface PaginatedFidePlayers {
  data: FidePlayer[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

@Injectable({
  providedIn: 'root'
})
export class FideService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/fide`;

  getPlayers(params: { search?: string, fed?: string, title?: string, page?: number } = {}): Observable<PaginatedFidePlayers> {
    return this.http.get<PaginatedFidePlayers>(`${this.apiUrl}/players`, { params: params as any });
  }

  getFederations(): Observable<FideFederation[]> {
    return this.http.get<FideFederation[]>(`${this.apiUrl}/federations`);
  }

  getRanking(type: 'standard' | 'rapid' | 'blitz' = 'standard'): Observable<FidePlayer[]> {
    return this.http.get<FidePlayer[]>(`${this.apiUrl}/ranking`, { params: { type } });
  }

  getPlayer(id: number): Observable<FidePlayer> {
    return this.http.get<FidePlayer>(`${this.apiUrl}/players/${id}`);
  }
}
