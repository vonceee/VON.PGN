import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent  } from '@shared/ui';

@Component({
  selector: 'app-game-history',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div>
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-20">
          <div
            class="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"
          ></div>
          <p class="text-xs font-semibold tracking-widest uppercase opacity-40">Loading games...</p>
        </div>
      } @else if (games().length > 0) {
        <div class="border border-border-theme rounded-xl overflow-hidden">
          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b border-border-theme">
                  <th class="p-4 text-left text-md uppercase font-black tracking-wider">Players</th>
                  <th class="p-4 text-left text-md uppercase font-black tracking-wider">Result</th>
                  <th class="p-4 text-center text-md uppercase font-black tracking-wider">Type</th>
                  <th class="p-4 text-center text-md uppercase font-black tracking-wider">Action</th>
                </tr>
              </thead>
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
                          <span class="text-[10px] font-mono">({{ game.white_elo || 1500 }})</span>
                          @if (game.white_rating_change !== null) {
                            <span
                              class="text-[10px] font-bold"
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
                          <span class="text-[10px] font-mono">({{ game.black_elo || 1500 }})</span>
                          @if (game.black_rating_change !== null) {
                            <span
                              class="text-[10px] font-bold"
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
                      <app-button
                        variant="ghost"
                        size="sm"
                        [routerLink]="['/games', game.id, 'review']"
                        label="View Game"
                      >
                      </app-button>
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
                <app-button
                  variant="outline"
                  size="sm"
                  [disabled]="currentPage() === 1"
                  (click)="loadPage(currentPage() - 1)"
                  label="Prev"
                  class="scale-90"
                ></app-button>
                <app-button
                  variant="outline"
                  size="sm"
                  [disabled]="currentPage() === totalPages()"
                  (click)="loadPage(currentPage() + 1)"
                  label="Next"
                  class="scale-90"
                ></app-button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div
          class="bg-slate-900/50 border border-border-theme border-dashed rounded-xl p-8 text-center"
        >
          <h3 class="text-sm font-bold mb-2 opacity-60">No games found</h3>
          <app-button variant="primary" size="sm" routerLink="/play" label="Play Now"></app-button>
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

