import { Component, inject, OnInit, OnDestroy, signal, computed, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { TacticsService, LeaderboardResponse } from '../../../core/services/tactics.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { TypewriterTextComponent  } from '@shared/ui';
import { UserHovercardDirective } from '@shared/directives';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, UserHovercardDirective],
  templateUrl: './leaderboard.component.html',
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  private tacticsService = inject(TacticsService);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  userStreak = computed(() => this.userService.currentUser()?.progress?.puzzleStreak ?? 0);

  leaderboard = signal<LeaderboardResponse | null>(null);
  isLoading = signal(true);

  private refreshInterval$?: Subscription;

  ngOnInit() {
    this.loadLeaderboard();
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        this.refreshInterval$ = interval(1800000).subscribe(() => {
          this.ngZone.run(() => {
            this.loadLeaderboard();
          });
        });
      });
    }
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

