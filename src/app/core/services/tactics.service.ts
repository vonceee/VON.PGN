import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { UserService } from './user.service';

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
  xp_earned: number;
  leveled_up: boolean;
}

@Injectable({ providedIn: 'root' })
export class TacticsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getDailyPuzzle(): Observable<{ data: Puzzle }> {
    return this.http.get<{ data: Puzzle }>(`${this.apiUrl}/tactics/next`);
  }

  solvePuzzle(puzzleId: number, success: boolean): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${this.apiUrl}/tactics/solve`, {
      puzzle_id: puzzleId,
      success: success,
    }).pipe(
      tap((response) => {
        if (response.leveled_up) {
          this.toastService.show(
            'Level Up! New Level ' + this.userService.currentUser()?.progress.currentLevel,
            'level-up',
            6000
          );
        }

        if (this.userService.currentUser()) {
          this.userService.loadMyProfile().subscribe();
        }
      })
    );
  }
}
