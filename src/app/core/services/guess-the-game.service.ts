import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GuessTheGameChallenge {
  id: number;
  white_player: string;
  black_player: string;
  event: string;
  year: number;
  eco?: string | null;
  result: string;
  pgn: string;
  active_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class GuessTheGameService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getDailyChallenge(challengeId?: number): Observable<{ data: GuessTheGameChallenge }> {
    const url = challengeId 
      ? `${this.apiUrl}/guess-the-game/daily?challenge_id=${challengeId}` 
      : `${this.apiUrl}/guess-the-game/daily`;
    return this.http.get<{ data: GuessTheGameChallenge }>(url);
  }

  getNextChallenge(currentId?: number): Observable<{ data: GuessTheGameChallenge }> {
    const url = currentId 
      ? `${this.apiUrl}/guess-the-game/next?current_id=${currentId}` 
      : `${this.apiUrl}/guess-the-game/next`;
    return this.http.get<{ data: GuessTheGameChallenge }>(url);
  }

  importChallenge(pgn: string, activeDate?: string | null): Observable<{ success: boolean; data: GuessTheGameChallenge; overwritten?: boolean }> {
    return this.http.post<{ success: boolean; data: GuessTheGameChallenge; overwritten?: boolean }>(
      `${this.apiUrl}/admin/guess-the-game/import`,
      { pgn, active_date: activeDate }
    );
  }
}
