import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { TacticsService, LeaderboardResponse } from '../../../core/services/tactics.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-tactics-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tactics-leaderboard.component.html',
})
export class TacticsLeaderboardComponent implements OnInit, OnDestroy {
  private tacticsService = inject(TacticsService);
  authService = inject(AuthService);

  leaderboard = signal<LeaderboardResponse | null>(null);
  isLoading = signal(true);
  activeTab = signal<'rating' | 'streak'>('rating');

  private refreshInterval$?: Subscription;

  ngOnInit() {
    this.loadLeaderboard();
    this.refreshInterval$ = interval(1800000).subscribe(() => this.loadLeaderboard());
  }

  ngOnDestroy() {
    this.refreshInterval$?.unsubscribe();
  }

  loadLeaderboard() {
    this.isLoading.set(true);
    this.tacticsService.getLeaderboard().subscribe({
      next: (data) => {
        this.leaderboard.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'rating' | 'streak') {
    this.activeTab.set(tab);
  }
}
