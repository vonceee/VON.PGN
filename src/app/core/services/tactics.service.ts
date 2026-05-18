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
}
