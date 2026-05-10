import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '@shared/ui';
import { LoadingComponent } from '@shared/feedback';

@Component({
  selector: 'app-game-history',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, LoadingComponent],
  template: `
    <div class="flex flex-col gap-6">
      @if (isLoading()) {
        <app-loading></app-loading>
      } @else if (games().length > 0) {
        <!-- Table Header -->
        <div class="hidden md:flex items-center px-6 py-3 border-b border-border-theme">
          <div class="w-48 text-xs font-semibold capitalize">Version / Date</div>
          <div class="flex-1 text-xs font-semibold capitalize ml-4">Game Details</div>
        </div>

        <div class="flex flex-col">
          @for (game of games(); track game.id) {
            <div class="flex flex-col md:flex-row md:items-start group py-8 px-2 md:px-6 hover:bg-white/[0.02]   border-b border-border-theme/50 last:border-0">
              <!-- Left Column: Meta -->
              <div class="w-full md:w-48 mb-4 md:mb-0 shrink-0">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-semibold">
                    {{ getGameType(game.time_control) }}
                    <span class="text-xs ml-1">{{ game.time_control }}</span>
                  </span>
                  <span class="text-xs capitalize">
                    {{ game.created_at | date: 'MMM d, y' }}
                  </span>
                </div>
              </div>

              <!-- Right Column: Content -->
              <div class="flex-1 md:ml-4">
                <div class="flex flex-col gap-4">
                  <!-- Result Title -->
                  <div class="flex flex-col gap-1">
                    <h3 class="text-lg font-semibold " [class]="getResultClass(game)">
                      {{ getResultText(game) }}
                    </h3>
                    <p class="text-sm  ">
                      against 
                      <a [routerLink]="['/user', getOpponent(game).name]" class="text-white hover:text-cyan-400 ">
                        {{ getOpponent(game).name }}
                      </a>
                      <span class="text-xs  ml-1">({{ getOpponentRating(game) }})</span>
                    </p>
                  </div>

                  <!-- Detail Card -->
                  <div class="ui-panel rounded-2xl p-5 bg-white/[0.03] border border-border-theme/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex flex-wrap items-center gap-6">
                      <!-- Rating Change Tag -->
                      @if (getMyRatingChange(game) !== null) {
                        <div class="flex flex-col gap-1">
                          <span class="text-xs font-semibold capitalize  ">Rating</span>
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-semibold" [class]="getMyRatingChange(game)! >= 0 ? 'text-green-500' : 'text-red-500'">
                              {{ getMyRatingChange(game)! > 0 ? '+' : '' }}{{ getMyRatingChange(game) }}
                            </span>
                            <span class="text-xs ">({{ getMyNewRating(game) }})</span>
                          </div>
                        </div>
                      }

                      <!-- Game Info (Placeholder for Accuracy/Performance if needed) -->
                      <div class="flex flex-col gap-1">
                        <span class="text-xs font-semibold capitalize">Status</span>
                        <span class="text-xs font-semibold">
                          {{ game.termination || 'Standard game' }}
                        </span>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-3">
                      <a
                        appButton
                        variant="outline"
                        [routerLink]="['/games', game.id, 'review']"
                        class="px-5 border-white/10 hover:bg-white/5"
                      >
                        Review Game
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="mt-8 flex items-center justify-between px-6">
            <span class="text-xs font-semibold capitalize  ">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            <div class="flex gap-2">
              <button
                appButton
                variant="ghost"
                [disabled]="currentPage() === 1"
                (click)="loadPage(currentPage() - 1)"
                class="hover:bg-white/5"
              >
                Previous
              </button>
              <button
                appButton
                variant="ghost"
                [disabled]="currentPage() === totalPages()"
                (click)="loadPage(currentPage() + 1)"
                class="hover:bg-white/5"
              >
                Next
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class GameHistoryComponent implements OnInit {
  private gameService = inject(GameService);
  private authService = inject(AuthService);

  games = signal<any[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  totalPages = signal(1);

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.isLoading.set(true);
    this.gameService.getGameHistory(page).subscribe({
      next: (res) => {
        this.games.set(res.data);
        this.currentPage.set(res.current_page);
        this.totalPages.set(res.last_page);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  isMe(userId: number): boolean {
    return this.authService.currentUser()?.uid === userId;
  }

  getOpponent(game: any) {
    return this.isMe(game.white_player_id) ? game.black_player : game.white_player;
  }

  getOpponentRating(game: any) {
    return this.isMe(game.white_player_id) ? game.black_elo : game.white_elo;
  }

  getMyRatingChange(game: any): number | null {
    return this.isMe(game.white_player_id) ? game.white_rating_change : game.black_rating_change;
  }

  getMyNewRating(game: any): number {
    const elo = this.isMe(game.white_player_id) ? (game.white_elo || 1500) : (game.black_elo || 1500);
    const change = this.getMyRatingChange(game) || 0;
    return elo + change;
  }

  getGameType(timeControl: string): string {
    if (!timeControl) return 'Casual';
    const seconds = parseInt(timeControl.split('+')[0]);
    if (seconds < 180) return 'Bullet';
    if (seconds < 600) return 'Blitz';
    return 'Rapid';
  }

  getResultText(game: any): string {
    if (game.result === '1/2-1/2') return 'Draw';

    const isMeWhite = this.isMe(game.white_player_id);
    const iWon = (game.result === '1-0' && isMeWhite) || (game.result === '0-1' && !isMeWhite);
    return iWon ? 'Victory' : 'Defeat';
  }

  getResultClass(game: any): string {
    if (game.result === '1/2-1/2') return '';

    const isMeWhite = this.isMe(game.white_player_id);
    const iWon = (game.result === '1-0' && isMeWhite) || (game.result === '0-1' && !isMeWhite);
    return iWon ? 'text-green-500' : 'text-red-500';
  }
}

