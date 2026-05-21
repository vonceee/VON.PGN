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
  moves: string;
  rating: number;
  themes: string;
  game_url?: string;
  opening_tags?: string;
  popularity?: number;
  nb_plays?: number;
  rating_deviation?: number;
}

export interface SolveResponse {
  success: boolean;
  new_rating: number;
  rating_change: number;
  new_streak: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
}

export interface UserLeaderboardStats {
  rank: number;
  score: number;
  in_top: boolean;
}

export interface LeaderboardResponse {
  tactics_rating: LeaderboardEntry[];
  streak: LeaderboardEntry[];
  bullet_rating: LeaderboardEntry[];
  blitz_rating: LeaderboardEntry[];
  rapid_rating: LeaderboardEntry[];
  my_stats: {
    tactics_rating: UserLeaderboardStats | null;
    streak: UserLeaderboardStats | null;
    bullet_rating: UserLeaderboardStats | null;
    blitz_rating: UserLeaderboardStats | null;
    rapid_rating: UserLeaderboardStats | null;
  };
}

@Injectable({ providedIn: 'root' })
export class TacticsService {
  private http = inject(HttpClient);
  private userService = inject(UserService);
  private apiUrl = environment.apiUrl;

  getDailyPuzzle(theme?: string): Observable<{ data: Puzzle }> {
    let url = `${this.apiUrl}/tactics/next`;
    if (theme) {
      url += `?theme=${theme}`;
    }
    return this.http.get<{ data: Puzzle }>(url);
  }

  getThemeCounts(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/tactics/themes`);
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
}

// Woodpecker interfaces
export interface WoodpeckerSession {
  id: number;
  user_id: number;
  name: string;
  puzzle_ids: number[];
  total_puzzles: number;
  rating_min: number | null;
  rating_max: number | null;
  theme: string | null;
  current_cycle_number: number;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
  cycles: WoodpeckerCycle[];
}

export interface WoodpeckerCycle {
  id: number;
  woodpecker_session_id: number;
  cycle_number: number;
  status: 'in_progress' | 'completed';
  current_puzzle_index: number;
  start_time: string;
  end_time: string | null;
  total_solved: number;
  total_correct: number;
  total_time_seconds: number;
  attempts: WoodpeckerAttempt[];
  created_at: string;
  updated_at: string;
}

export interface WoodpeckerAttempt {
  puzzle_id: number;
  correct: boolean;
  time_spent: number;
  moves: string;
  solved_at: string;
}

export interface WoodpeckerSolveResponse {
  success: boolean;
  cycle_completed: boolean;
  credits_rewarded?: number;
  session: WoodpeckerSession;
  current_cycle: WoodpeckerCycle | null;
  current_puzzle: Puzzle | null;
}
