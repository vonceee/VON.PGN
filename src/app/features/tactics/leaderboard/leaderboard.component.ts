import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { TacticsService, LeaderboardResponse } from '../../../core/services/tactics.service';
import { AuthService } from '../../../core/services/auth.service';
import { TypewriterTextComponent } from '../../../shared/components/typewriter-text/typewriter-text';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  private tacticsService = inject(TacticsService);
  authService = inject(AuthService);

  leaderboard = signal<LeaderboardResponse | null>(null);
  isLoading = signal(true);

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


}
