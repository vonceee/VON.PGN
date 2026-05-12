import { Component, OnInit, inject, signal, ChangeDetectionStrategy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '@shared/ui';
import { LoadingComponent } from '@shared/feedback';
import { ChessBoardComponent } from '@shared/chess';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-game-history',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, LoadingComponent, ChessBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4">
      <!-- Filter Pills -->
      <div class="flex items-center gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
        @for (filter of filters; track filter.id) {
          <button 
            appButton
            [variant]="selectedFilter() === filter.id ? 'primary' : 'outline'"
            (click)="setFilter(filter.id)"
          >
            {{ filter.label }}
          </button>
        }
      </div>

      @if (isLoading()) {
        <app-loading></app-loading>
      } @else if (games().length > 0) {
        <div class="flex flex-col gap-3">
          @for (game of games(); track game.id) {
            <div class="group flex flex-col md:flex-row gap-4 p-4 md:p-5 bg-surface border border-border-base rounded-2xl hover:border-accent/30 transition-all">
              
              <!-- Mini Board -->
              <div class="w-full md:w-32 lg:w-40 aspect-square shrink-0">
                <app-chess-board 
                  [fen]="getFinalFen(game)" 
                  [interactive]="false" 
                  [resizable]="false" 
                  [hideCoordinates]="true"
                  [fluid]="true"
                ></app-chess-board>
              </div>

              <!-- Game Content -->
              <div class="flex-1 flex flex-col justify-between py-1">
                <div>
                  <!-- Header: Meta -->
                  <div class="flex items-center gap-3 text-xs text-muted mb-4">
                    <span class="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      {{ getGameType(game.time_control) }} • {{ formatTimeControl(game.time_control) }}
                    </span>
                    <span>•</span>
                    <span class="capitalize">{{ game.created_at | date: 'MMM d, y' }}</span>
                  </div>

                  <!-- Players Grid -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 mb-5">
                    <!-- White Player -->
                    <div class="flex items-center gap-2">
                      <a [routerLink]="['/user', game.white_player.name]" class="text-sm font-bold text-content hover:text-accent transition-colors">
                        {{ game.white_player.name }}
                      </a>
                      <span class="text-xs text-muted">({{ game.white_elo }})</span>
                      @if (game.white_rating_change !== null) {
                        <span class="text-xs font-bold" [class]="game.white_rating_change >= 0 ? 'text-annotation-good' : 'text-annotation-bad'">
                          {{ game.white_rating_change > 0 ? '+' : '' }}{{ game.white_rating_change }}
                        </span>
                      }
                    </div>

                    <!-- Black Player -->
                    <div class="flex items-center gap-2">
                      <a [routerLink]="['/user', game.black_player.name]" class="text-sm font-bold text-content hover:text-accent transition-colors">
                        {{ game.black_player.name }}
                      </a>
                      <span class="text-xs text-muted">({{ game.black_elo }})</span>
                      @if (game.black_rating_change !== null) {
                        <span class="text-xs font-bold" [class]="game.black_rating_change >= 0 ? 'text-annotation-good' : 'text-annotation-bad'">
                          {{ game.black_rating_change > 0 ? '+' : '' }}{{ game.black_rating_change }}
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Result Summary -->
                  <div class="flex flex-col gap-1.5">
                    <div class="text-xs font-semibold" [class]="getResultClass(game)">
                      {{ getVictoryText(game) }}
                    </div>
                    
                    <!-- Opening Placeholder -->
                    <div class="flex flex-col gap-0.5">
                      <div class="text-xs font-bold text-content truncate max-w-[300px]">
                        {{ getOpeningName(game) }}
                      </div>
                      <div class="text-xs text-muted  truncate max-w-[300px]">
                        {{ getMoveSequence(game) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex md:flex-col items-center justify-center gap-2 shrink-0 md:border-l border-border-base md:pl-5">
                <a
                  appButton
                  variant="outline"
                  size="sm"
                  [routerLink]="['/games', game.id, 'review']"
                  class="w-full md:w-auto px-4 whitespace-nowrap"
                >
                  Review
                </a>
              </div>
            </div>
          }
        </div>

        <!-- Load More -->
        @if (hasMore()) {
          <div class="mt-8 flex justify-center pb-6">
            <button
              appButton
              variant="outline"
              [loading]="isLoadingMore()"
              (click)="loadNextPage()"
              class="px-12 py-3 rounded-xl border-border-base hover:border-accent/50 text-xs font-bold uppercase tracking-widest transition-all"
            >
              View More Games
            </button>
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
  isLoadingMore = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  hasMore = signal(false);
  selectedFilter = signal<string>('all');

  filters = [
    { id: 'all', label: 'All' },
    { id: 'bullet', label: 'Bullet' },
    { id: 'blitz', label: 'Blitz' },
    { id: 'rapid', label: 'Rapid' }
  ];

  constructor() {
    effect(() => {
      this.selectedFilter(); // Trigger tracking
      untracked(() => this.loadPage(1));
    });
  }

  ngOnInit(): void {
    // Initial load handled by effect
  }

  loadPage(page: number): void {
    if (page === 1) {
      this.isLoading.set(true);
    } else {
      this.isLoadingMore.set(true);
    }

    this.gameService.getGameHistory(page, this.selectedFilter()).subscribe({
      next: (res) => {
        if (page === 1) {
          this.games.set(res.data);
        } else {
          this.games.update(prev => [...prev, ...res.data]);
        }
        
        this.currentPage.set(res.current_page);
        this.totalPages.set(res.last_page);
        this.hasMore.set(res.current_page < res.last_page);
        
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
    });
  }

  loadNextPage(): void {
    if (!this.isLoading() && !this.isLoadingMore() && this.hasMore()) {
      this.loadPage(this.currentPage() + 1);
    }
  }

  setFilter(type: string): void {
    this.selectedFilter.set(type);
  }

  isMe(userId: number | string): boolean {
    const currentId = this.authService.currentUser()?.uid || this.authService.currentUser()?.id;
    if (!currentId || !userId) return false;
    return String(currentId) === String(userId);
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

  formatTimeControl(timeControl: string): string {
    if (!timeControl) return '';
    const parts = timeControl.split('+');
    const seconds = parseInt(parts[0]);
    const increment = parts[1] || '0';
    const minutes = seconds / 60;
    return `${minutes}+${increment}`;
  }

  getResultText(game: any): string {
    if (game.status === 'aborted') return 'Aborted';

    const result = game.result?.replace(/\s/g, '');
    if (result === '1/2-1/2' || result === '0.5-0.5' || game.termination === 'draw') {
      return 'Draw';
    }

    const isMeWhite = this.isMe(game.white_player_id);
    const iWon = (result === '1-0' && isMeWhite) || (result === '0-1' && !isMeWhite);
    return iWon ? 'Victory' : 'Defeat';
  }

  getResultClass(game: any): string {
    if (game.status === 'aborted') return 'text-muted';

    const result = game.result?.replace(/\s/g, '');
    if (result === '1/2-1/2' || result === '0.5-0.5' || game.termination === 'draw') {
      return 'text-muted';
    }

    const whiteWon = result === '1-0';
    const blackWon = result === '0-1';
    
    const isMeWhite = this.isMe(game.white_player_id);
    const iWon = (whiteWon && isMeWhite) || (blackWon && !isMeWhite);
    return iWon ? 'text-annotation-good' : 'text-annotation-bad';
  }

  getVictoryText(game: any): string {
    if (game.status === 'aborted') return 'Aborted';
    
    const result = game.result?.replace(/\s/g, '');
    if (result === '1/2-1/2' || result === '0.5-0.5' || game.termination === 'draw') {
      return 'Draw';
    }

    const whiteWon = result === '1-0';
    const blackWon = result === '0-1';
    const winner = whiteWon ? 'White' : 'Black';
    
    let text = '';
    if (game.termination === 'checkmate') text = 'Checkmate';
    else if (game.termination === 'resigned') text = `${winner} resigned`;
    else if (game.termination === 'timeout') text = 'Time out';
    else text = game.termination || 'Game ended';

    return `${text} • ${winner} is victorious`;
  }

  getFinalFen(game: any): string {
    if (!game.moves || game.moves.length === 0) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    const chess = new Chess();
    try {
      for (const m of game.moves) {
        chess.move({ 
          from: m.substring(0, 2), 
          to: m.substring(2, 4), 
          promotion: m.length > 4 ? m.substring(4) : 'q' 
        });
      }
      return chess.fen();
    } catch (e) {
      console.warn('Error generating final FEN:', e);
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
  }

  getOpeningName(game: any): string {
    // Placeholder for Phase 2
    return 'Opening detection coming soon';
  }

  getMoveSequence(game: any): string {
    if (!game.moves || game.moves.length === 0) return 'No moves played';
    
    const chess = new Chess();
    const moves: string[] = [];
    const maxMoves = 8; // Show first 4 full moves
    
    try {
      for (let i = 0; i < Math.min(game.moves.length, maxMoves); i++) {
        const m = game.moves[i];
        const move = chess.move({ 
          from: m.substring(0, 2), 
          to: m.substring(2, 4), 
          promotion: m.length > 4 ? m.substring(4) : 'q' 
        });
        
        if (move) {
          if (i % 2 === 0) {
            moves.push(`${(i / 2) + 1}. ${move.san}`);
          } else {
            moves.push(move.san);
          }
        }
      }
      
      let sequence = moves.join(' ');
      if (game.moves.length > maxMoves) sequence += ' ...';
      return sequence;
    } catch (e) {
      return game.moves.slice(0, 4).join(' ') + ' ...';
    }
  }
}

