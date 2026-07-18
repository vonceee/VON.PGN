import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GuessTheGameChallenge {
  id: number;
  white_player: string;
  black_player: string;
  white_rating?: string | null;
  black_rating?: string | null;
  event: string;
  year: number;
  eco?: string | null;
  result: string;
  pgn: string;
  description?: string | null;
  is_study_chapter?: boolean;
  study_id?: number | null;
  study_link?: string | null;
  active_date?: string | null;
  created_at?: string;
  updated_at?: string;
  initial_fen?: string | null;
  start_ply?: number | null;
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

}
