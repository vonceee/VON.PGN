import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';
import { environment } from '../../../../environments/environment';
import {
  Puzzle,
  SolveResponse,
  LeaderboardResponse,
  PuzzleAttempt,
  WoodpeckerSession,
  WoodpeckerCycle,
  WoodpeckerSolveResponse,
} from '../models/tactics.model';

export * from '../models/tactics.model';

@Injectable({ providedIn: 'root' })
export class TacticsService {
  private http = inject(HttpClient);
  private userService = inject(UserService);
  private apiUrl = environment.apiUrl;

  getDailyPuzzle(theme?: string, puzzleId?: number): Observable<{ data: Puzzle }> {
    let url = `${this.apiUrl}/tactics/next`;
    const params: string[] = [];
    if (theme) {
      params.push(`theme=${theme}`);
    }
    if (puzzleId) {
      params.push(`puzzle_id=${puzzleId}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.get<{ data: Puzzle; is_rated?: boolean }>(url);
  }

  getNextPuzzle(theme?: string, excludeIds?: number[], isNew: boolean = false): Observable<{ data: Puzzle; is_rated?: boolean; resumed?: boolean }> {
    let url = `${this.apiUrl}/tactics/next`;
    const params: string[] = [];
    if (theme) {
      params.push(`theme=${theme}`);
    }
    if (excludeIds && excludeIds.length > 0) {
      params.push(`exclude_ids=${excludeIds.slice(-50).join(',')}`);
    }
    if (isNew) {
      params.push('new=1');
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.get<{ data: Puzzle; is_rated?: boolean; resumed?: boolean }>(url);
  }

  getPuzzleHistory(): Observable<{ data: PuzzleAttempt[] }> {
    return of({ data: [] });
  }

  getThemeCounts(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/tactics/themes`);
  }

  solvePuzzle(puzzleId: number, success: boolean): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${this.apiUrl}/tactics/solve`, {
      puzzle_id: puzzleId,
      success: success,
    }).pipe(
      tap((res) => {
        if (this.userService.currentUser() && res.is_rated !== false) {
          this.userService.updatePuzzleProgress(res.new_rating, res.new_streak, success);
        }
      })
    );
  }

  getLeaderboard(): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>(`${this.apiUrl}/tactics/leaderboard`);
  }

  // Woodpecker Method APIs
  getWoodpeckerSessions(): Observable<{ data: WoodpeckerSession[] }> {
    return this.http.get<{ data: WoodpeckerSession[] }>(`${this.apiUrl}/tactics/woodpecker`);
  }

  createWoodpeckerSession(config: {
    name: string;
    total_puzzles: number;
    theme?: string;
    rating_min?: number;
    rating_max?: number;
  }): Observable<{ success: boolean; session: WoodpeckerSession; cycle: WoodpeckerCycle }> {
    return this.http.post<{ success: boolean; session: WoodpeckerSession; cycle: WoodpeckerCycle }>(
      `${this.apiUrl}/tactics/woodpecker`,
      config
    );
  }

  getWoodpeckerSession(id: number): Observable<{
    session: WoodpeckerSession;
    current_cycle: WoodpeckerCycle | null;
    current_puzzle: Puzzle | null;
  }> {
    return this.http.get<{
      session: WoodpeckerSession;
      current_cycle: WoodpeckerCycle | null;
      current_puzzle: Puzzle | null;
    }>(`${this.apiUrl}/tactics/woodpecker/${id}`);
  }

  submitWoodpeckerSolve(
    id: number,
    success: boolean,
    timeSpentSeconds: number,
    moves?: string
  ): Observable<WoodpeckerSolveResponse> {
    return this.http.post<WoodpeckerSolveResponse>(`${this.apiUrl}/tactics/woodpecker/${id}/solve`, {
      success,
      time_spent_seconds: timeSpentSeconds,
      moves: moves ?? '',
    }).pipe(
      tap(() => {
        if (this.userService.currentUser()) {
          this.userService.loadMyProfile().subscribe();
        }
      })
    );
  }

  abandonWoodpeckerSession(id: number): Observable<{ success: boolean; session: WoodpeckerSession }> {
    return this.http.post<{ success: boolean; session: WoodpeckerSession }>(
      `${this.apiUrl}/tactics/woodpecker/${id}/abandon`,
      {}
    );
  }

  deleteWoodpeckerSession(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/tactics/woodpecker/${id}`);
  }
}
