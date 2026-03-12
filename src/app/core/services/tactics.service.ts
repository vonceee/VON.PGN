import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Puzzle {
  id: number;
  lichess_puzzle_id: string;
  fen: string;
  moves: string; // e.g., "e2e4 e7e5 g1f3"
  rating: number;
  themes: string;
}

export interface SolveResponse {
  success: boolean;
  new_rating: number;
  rating_change: number;
  xp_earned: number;
  new_streak: number;
}

@Injectable({ providedIn: 'root' })
export class TacticsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getDailyPuzzle(): Observable<{ data: Puzzle }> {
    return this.http.get<{ data: Puzzle }>(`${this.apiUrl}/tactics/next`);
  }

  solvePuzzle(puzzleId: number, success: boolean): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${this.apiUrl}/tactics/solve`, {
      puzzle_id: puzzleId,
      success: success,
    });
  }
}
