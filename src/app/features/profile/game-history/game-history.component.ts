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
    <div>
      @if (isLoading()) {
        <app-loading message="Loading games..."></app-loading>
      } @else if (games().length > 0) {
        <div class="border border-border-theme rounded-xl overflow-hidden premium-card">
          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full border-collapse">
              <tbody class="divide-y divide-border-theme">
                @for (game of games(); track game.id) {
                  <tr class="hover:bg-white/5 transition-colors group">
                    <td class="p-4">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full border border-border-theme"></div>
                          <span
                            class="font-bold shrink-0 text-sm"
                            [class.text-cyan-400]="isMe(game.white_player_id)"
                          >
                            {{ game.white_player.name }}
                          </span>
                          <span class="text-xs">({{ game.white_elo || 1500 }})</span>
                          @if (game.white_rating_change !== null) {
                            <span
                              class="text-xs"
                              [class]="
                                game.white_rating_change >= 0 ? 'text-green-500' : 'text-red-500'
                              "
                            >
                              {{ game.white_rating_change > 0 ? '+' : ''
                              }}{{ game.white_rating_change }}
                            </span>
                          }
                        </div>
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full border border-border-theme"></div>
                          <span
                            class="font-bold shrink-0 text-sm"
                            [class.text-cyan-400]="isMe(game.black_player_id)"
                          >
                            {{ game.black_player.name }}
                          </span>
                          <span class="text-xs">({{ game.black_elo || 1500 }})</span>
                          @if (game.black_rating_change !== null) {
                            <span
                              class="text-xs"
                              [class]="
                                game.black_rating_change >= 0 ? 'text-green-500' : 'text-red-500'
                              "
                            >
                              {{ game.black_rating_change > 0 ? '+' : ''
                              }}{{ game.black_rating_change }}
                            </span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="p-4 text-left">
                      <span class="font-black text-base" [class]="getResultClass(game)">
                        {{ getResultText(game) }}
                      </span>
                    </td>
                    <td class="p-4 text-center">
                      <span class="text-sm font-black tracking-tighter">{{
                        game.time_control
                      }}</span>
                    </td>
                    <td class="p-4 text-center">
                      <a
                        appButton
                        variant="ghost"
                        size="sm"
                        [routerLink]="['/games', game.id, 'review']"
                      >
                        View Game
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div
              class="p-3 border-t border-border-theme flex items-center justify-between bg-slate-800/20"
            >
              <span class="text-[10px]  font-bold uppercase tracking-widest"
                >Page {{ currentPage() }} of {{ totalPages() }}</span
              >
              <div class="flex gap-2">
                <button
                  appButton
                  variant="outline"
                  size="sm"
                  [disabled]="currentPage() === 1"
                  (click)="loadPage(currentPage() - 1)"
                  class="scale-90"
                >
                  Prev
                </button>
                <button
                  appButton
                  variant="outline"
                  size="sm"
                  [disabled]="currentPage() === totalPages()"
                  (click)="loadPage(currentPage() + 1)"
                  class="scale-90"
                >
                  Next
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div
          class="bg-slate-900/50 border border-border-theme border-dashed rounded-xl p-8 text-center"
        >
          <h3 class="text-sm font-bold mb-2 opacity-60">No games found</h3>
          <a appButton variant="primary" size="sm" routerLink="/play">Play Now</a>
        </div>
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

  getResultText(game: any): string {
    if (game.result === '1/2-1/2') return 'Draw';

    const isMeWhite = this.isMe(game.white_player_id);
    const result = game.result === '1-0' ? 'White Won' : 'Black Won';

    const iWon = (game.result === '1-0' && isMeWhite) || (game.result === '0-1' && !isMeWhite);
    return iWon ? 'Victory' : 'Defeat';
  }

  getResultClass(game: any): string {
    if (game.result === '1/2-1/2') return 'text-slate-400';

    const isMeWhite = this.isMe(game.white_player_id);
    const iWon = (game.result === '1-0' && isMeWhite) || (game.result === '0-1' && !isMeWhite);
    return iWon ? 'text-green-500' : 'text-red-500';
  }
}
