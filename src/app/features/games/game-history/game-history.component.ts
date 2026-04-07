import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-game-history',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div class="max-w-4xl mx-auto p-4 lg:p-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-black mb-2">Game History</h1>
          <p class="text-slate-400">Review your past chess matches and performance.</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-20">
          <div class="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="text-slate-400">Loading your games...</p>
        </div>
      } @else if (games().length > 0) {
        <div class="bg-slate-900/50 border border-border-theme rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border-theme bg-slate-800/30">
                  <th class="p-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Players</th>
                  <th class="p-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Result</th>
                  <th class="p-4 text-[10px] uppercase font-black text-slate-500 tracking-wider text-center">Type</th>
                  <th class="p-4 text-[10px] uppercase font-black text-slate-500 tracking-wider text-center">Date</th>
                  <th class="p-4 text-[10px] uppercase font-black text-slate-500 tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-theme">
                @for (game of games(); track game.id) {
                  <tr class="hover:bg-white/5 transition-colors group">
                    <td class="p-4">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full bg-white border border-slate-500"></div>
                          <span class="font-bold shrink-0" [class.text-cyan-400]="isMe(game.white_player_id)">
                            {{ game.white_player.name }}
                          </span>
                          <span class="text-[11px] font-mono opacity-40">({{ game.white_elo || 1500 }})</span>
                          @if (game.white_rating_change !== null) {
                            <span class="text-[10px] font-bold" [class]="game.white_rating_change >= 0 ? 'text-green-500' : 'text-red-500'">
                              {{ game.white_rating_change > 0 ? '+' : '' }}{{ game.white_rating_change }}
                            </span>
                          }
                        </div>
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full bg-slate-950 border border-slate-500"></div>
                          <span class="font-bold shrink-0" [class.text-cyan-400]="isMe(game.black_player_id)">
                            {{ game.black_player.name }}
                          </span>
                          <span class="text-[11px] font-mono opacity-40">({{ game.black_elo || 1500 }})</span>
                          @if (game.black_rating_change !== null) {
                            <span class="text-[10px] font-bold" [class]="game.black_rating_change >= 0 ? 'text-green-500' : 'text-red-500'">
                              {{ game.black_rating_change > 0 ? '+' : '' }}{{ game.black_rating_change }}
                            </span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="p-4">
                      <div class="flex flex-col">
                        <span class="font-black text-lg" [class]="getResultClass(game)">
                          {{ getResultText(game) }}
                        </span>
                        <span class="text-[10px] uppercase font-bold opacity-40">
                          {{ game.termination }}
                        </span>
                      </div>
                    </td>
                    <td class="p-4 text-center">
                      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
                        <span class="text-xs font-bold">{{ game.time_control }}</span>
                      </div>
                    </td>
                    <td class="p-4 text-center">
                      <div class="text-xs opacity-50 font-mono">
                        {{ game.created_at | date:'MMM d, y' }}
                      </div>
                    </td>
                    <td class="p-4 text-right">
                      <app-button 
                        variant="outline" 
                        size="sm" 
                        [routerLink]="['/games', game.id, 'review']"
                        label="Review"
                      >
                        <svg class="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </app-button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="p-4 border-t border-border-theme flex items-center justify-between bg-slate-800/20">
              <span class="text-xs text-slate-500 font-mono">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <div class="flex gap-2">
                <app-button 
                  variant="outline" 
                  size="sm" 
                  [disabled]="currentPage() === 1"
                  (click)="loadPage(currentPage() - 1)"
                  label="Previous"
                ></app-button>
                <app-button 
                  variant="outline" 
                  size="sm" 
                  [disabled]="currentPage() === totalPages()"
                  (click)="loadPage(currentPage() + 1)"
                  label="Next"
                ></app-button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="bg-slate-900/50 border border-border-theme border-dashed rounded-xl p-12 text-center">
          <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-600">
             <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
             </svg>
          </div>
          <h3 class="text-xl font-bold mb-2">No games found</h3>
          <p class="text-slate-400 max-w-sm mx-auto mb-6">
            You haven't completed any games yet. Start playing now to build your history!
          </p>
          <app-button variant="primary" routerLink="/play" label="Play Now"></app-button>
        </div>
      }
    </div>
  `
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
      }
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
