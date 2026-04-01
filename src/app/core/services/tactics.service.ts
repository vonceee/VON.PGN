import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

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
  new_streak: number;
}

@Injectable({ providedIn: 'root' })
export class TacticsService {
  private http = inject(HttpClient);
  private userService = inject(UserService);
  private apiUrl = environment.apiUrl;

  getDailyPuzzle(): Observable<{ data: Puzzle }> {
    return this.http.get<{ data: Puzzle }>(`${this.apiUrl}/tactics/next`);
  }

  solvePuzzle(puzzleId: number, success: boolean): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${this.apiUrl}/tactics/solve`, {
      puzzle_id: puzzleId,
      success: success,
    }).pipe(
      tap(() => {
        if (this.userService.currentUser()) {
          this.userService.loadMyProfile().subscribe();
        }
      })
    );
  }
}
