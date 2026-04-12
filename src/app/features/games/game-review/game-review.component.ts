import {
  Component,
  OnInit,
  inject,
  signal,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  HostListener,
  PLATFORM_ID,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { AuthService } from '../../../core/services/auth.service';
import { GameState } from '../../../core/models/game.model';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-game-review',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-6">
      <div class="w-full max-w-none">
        @if (isLoading()) {
          <div class="flex items-center justify-center py-20">
            <div class="text-center">
              <div
                class="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              ></div>
              <p class="text-slate-400">Loading game archive...</p>
            </div>
          </div>
        } @else if (game(); as g) {
          <div class="flex flex-col lg:flex-row gap-4 items-start justify-center">
            <!-- Left Side: Game Info & PGN (Reusing LiveGame Sidebar Style) -->
            <div
              class="w-full lg:w-80 flex flex-col order-3 lg:order-1 border border-border-theme rounded-xl overflow-hidden "
              [style.height.px]="boardSize()"
            >
              <!-- Header Section -->
              <div class="p-4 border-b border-border-theme bg-slate-800/30">
                <div class="flex items-center justify-between mb-4">
                  <div class="text-2xl font-black flex items-center gap-2 opacity-80">
                    <span>•</span>
                    <span>Review</span>
                  </div>
                  <div class="text-xs font-mono opacity-40 uppercase tracking-widest">
                    {{ g.time_control }}
                  </div>
                </div>

                <!-- Opponent -->
                <div class="flex items-center justify-between text-sm mb-3">
                  <div class="flex items-center gap-3 opacity-80 overflow-hidden">
                    <div
                      class="w-3 h-3 rounded-full shrink-0 border border-slate-500 bg-slate-950"
                    ></div>
                    <span class="truncate font-bold">{{ g.black_player.name }}</span>
                  </div>
                  <div class="flex items-center gap-2 font-mono text-[13px] shrink-0 ml-4">
                    <span class="opacity-50">({{ g.black_elo }})</span>
                    @if (g.black_rating_change !== null) {
                      <span
                        class="font-bold whitespace-nowrap"
                        [class]="g.black_rating_change >= 0 ? 'text-green-400' : 'text-red-400'"
                      >
                        {{ g.black_rating_change > 0 ? '+' : '' }}{{ g.black_rating_change }}
                      </span>
                    }
                  </div>
                </div>

                <!-- White Player -->
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-3 opacity-80 overflow-hidden">
                    <div
                      class="w-3 h-3 rounded-full shrink-0 border border-slate-500 bg-white"
                    ></div>
                    <span class="truncate font-bold">{{ g.white_player.name }}</span>
                  </div>
                  <div class="flex items-center gap-2 font-mono text-[13px] shrink-0 ml-4">
                    <span class="opacity-50">({{ g.white_elo }})</span>
                    @if (g.white_rating_change !== null) {
                      <span
                        class="font-bold whitespace-nowrap"
                        [class]="g.white_rating_change >= 0 ? 'text-green-400' : 'text-red-400'"
                      >
                        {{ g.white_rating_change > 0 ? '+' : '' }}{{ g.white_rating_change }}
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- PGN Viewer Navigation -->
              <div
                class="flex items-center justify-center gap-1 p-2 border-b border-border-theme bg-slate-900/30"
              >
                <app-button
                  variant="outline"
                  size="sm"
                  (click)="goToStart()"
                  [disabled]="currentMoveIndex() === -1"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="11 17 6 12 11 7" />
                    <polyline points="18 17 13 12 18 7" />
                  </svg>
                </app-button>
                <app-button
                  variant="outline"
                  size="sm"
                  (click)="prevMove()"
                  [disabled]="currentMoveIndex() === -1"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </app-button>
                <app-button
                  variant="outline"
                  size="sm"
                  (click)="nextMove()"
                  [disabled]="currentMoveIndex() === (g.moves?.length || 0) - 1"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </app-button>
                <app-button
                  variant="outline"
                  size="sm"
                  (click)="goToEnd()"
                  [disabled]="currentMoveIndex() === (g.moves?.length || 0) - 1"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                  </svg>
                </app-button>
              </div>

              <!-- Moves grid -->
              <div class="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
                <div class="grid grid-cols-[2.5rem_1fr_1fr] text-[13px]">
                  @for (round of moveRounds(); track round.num) {
                    <div
                      class="py-2 flex items-center justify-center font-bold opacity-20 border-r border-white/5 bg-white/5"
                    >
                      {{ round.num }}
                    </div>
                    <div
                      (click)="goToMove(round.whiteIndex)"
                      class="py-2 px-3 cursor-pointer hover:bg-cyan-500/10 transition-all text-center flex items-center justify-center border-b border-white/5"
                      [class.bg-cyan-500/20]="round.whiteIndex === currentMoveIndex()"
                      [class.font-black]="round.whiteIndex === currentMoveIndex()"
                    >
                      <span [class.text-cyan-400]="round.whiteIndex === currentMoveIndex()">{{
                        round.white
                      }}</span>
                    </div>
                    <div
                      (click)="goToMove(round.blackIndex)"
                      class="py-2 px-3 cursor-pointer hover:bg-cyan-500/10 transition-all text-center flex items-center justify-center border-b border-white/5"
                      [class.bg-cyan-500/20]="round.blackIndex === currentMoveIndex()"
                      [class.font-black]="round.blackIndex === currentMoveIndex()"
                    >
                      @if (round.black) {
                        <span [class.text-cyan-400]="round.blackIndex === currentMoveIndex()">{{
                          round.black
                        }}</span>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Game Result Footer -->
              <div class="p-3 border-t border-border-theme bg-slate-800/50">
                <div class="flex flex-col items-center gap-1">
                  <div class="text-sm font-black" [class]="getResultClass(g)">{{ g.result }}</div>
                  <div class="text-[10px] uppercase font-bold opacity-40">{{ g.termination }}</div>
                </div>
              </div>
            </div>

            <!-- Center: Chess Board (Reusing LiveGame Board Layout) -->
            <div class="flex flex-col items-center order-1 lg:order-2">
              <div class="relative">
                <div class="board-wrapper" [style.width.px]="boardSize()">
                  <div #boardEl class="board-container" ngSkipHydration></div>
                </div>
                <!-- Resizer Dragger -->
                <div
                  class="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end opacity-20 hover:opacity-100 transition-opacity"
                  (mousedown)="startResize($event)"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" class="text-slate-500">
                    <path
                      d="M11 11H9.5V9.5H11V11ZM11 7.5H9.5V6H11V7.5ZM7.5 11H6V9.5H7.5V11Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>

              <!-- Board Controls Bar -->
              <div class="w-full flex items-center justify-between mt-6">
                <app-button
                  variant="outline"
                  size="md"
                  routerLink="/games/history"
                  label="Back to History"
                >
                  <svg
                    class="w-4 h-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </app-button>

                <div class="flex items-center gap-4">
                  <div
                    class="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-border-theme"
                  >
                    <span class="text-[10px] uppercase font-black opacity-30 tracking-widest"
                      >Board Size</span
                    >
                    <input
                      type="range"
                      [min]="280"
                      [max]="1000"
                      [value]="boardSize()"
                      (input)="onResizeSlider($event)"
                      class="accent-cyan-400 w-24"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Secondary Info (Time Control / Analysis Info) -->
            <div
              class="hidden lg:flex w-48 flex-col justify-between order-2 lg:order-3"
              [style.height.px]="boardSize()"
            >
              <div class="p-4 border border-border-theme rounded-xl bg-slate-900/50">
                <div class="text-[10px] uppercase font-black text-slate-500 mb-2">Details</div>
                <div class="space-y-3">
                  <div>
                    <div class="text-[10px] text-slate-500 uppercase font-bold">Played on</div>
                    <div class="text-xs font-mono">
                      {{ game()?.created_at | date: 'mediumDate' }}
                    </div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500 uppercase font-bold">Category</div>
                    <div class="text-xs font-mono">{{ game()?.time_control }}</div>
                  </div>
                </div>
              </div>

              <div class="p-4 border border-border-theme rounded-xl bg-cyan-500/5 border-dashed">
                <p class="text-[10px] text-slate-500 text-center uppercase font-black italic">
                  Engine analysis coming soon
                </p>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .board-wrapper {
        container-type: inline-size;
        aspect-ratio: 1 / 1;
        max-width: 100vw;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .board-container {
        width: 100%;
        height: 100%;
        display: block;
        position: relative;
      }
      input[type='range'] {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        cursor: pointer;
      }
    `,
  ],
})
export class GameReviewComponent implements OnInit, AfterViewInit, OnDestroy {
  boardEl = viewChild<ElementRef<HTMLDivElement>>('boardEl');

  private route = inject(ActivatedRoute);
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  game = signal<any | null>(null);
  isLoading = signal(true);
  boardSize = signal(600);
  currentMoveIndex = signal(-1);

  private cgApi!: Api;
  private chess = new Chess();
  private chessHistory: Chess[] = [];
  private isResizing = false;

  constructor() {
    // Adoption of LiveGame's effect for initialization and syncing
    effect(() => {
      const el = this.boardEl();
      const g = this.game();

      if (el && g) {
        const nativeEl = el.nativeElement;
        if (!this.cgApi && isPlatformBrowser(this.platformId)) {
          this.initBoard(nativeEl);
        } else {
          this.syncBoard();
        }
      }
    });
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.params['gameId'];
    this.loadGame(gameId);

    if (isPlatformBrowser(this.platformId)) {
      const savedSize = localStorage.getItem('chess_board_size');
      if (savedSize) {
        this.boardSize.set(parseInt(savedSize, 10));
      } else {
        this.boardSize.set(Math.min(600, window.innerWidth - 40));
      }
    }
  }

  ngAfterViewInit(): void {
    // Board is initialized via effect
  }

  ngOnDestroy(): void {
    if (this.cgApi) this.cgApi.destroy();
  }

  loadGame(gameId: string): void {
    this.gameService.getArchivedGame(gameId).subscribe({
      next: (res) => {
        this.game.set(res.game);
        this.processMoves(res.game.moves || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  processMoves(moves: string[]): void {
    this.chess.reset();
    this.chessHistory = [new Chess()];
    for (const move of moves) {
      const c = new Chess(this.chess.fen());
      try {
        c.move(move);
        this.chess.move(move);
        this.chessHistory.push(c);
      } catch (e) {
        // Silent fail for invalid moves in history
      }
    }
    this.currentMoveIndex.set(-1);
  }

  initBoard(el: HTMLDivElement): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const currentUser = this.authService.currentUser();
    const isBlack = this.game()?.black_player_id === currentUser?.uid;

    this.cgApi = Chessground(el, {
      fen: 'start',
      viewOnly: true,
      orientation: isBlack ? 'black' : 'white',
      lastMove: undefined,
      drawable: { enabled: true },
    });

    this.syncBoard();
  }

  syncBoard(): void {
    if (!this.cgApi) return;

    const moves = this.game()?.moves || [];
    const index = this.currentMoveIndex();

    let fen = 'start';
    let lastMove: any = undefined;

    if (index >= 0 && index < moves.length) {
      const currentChess = this.chessHistory[index + 1];
      fen = currentChess.fen();

      // Use move from history list if possible
      const history = currentChess.history({ verbose: true });
      const last = history[history.length - 1];
      if (last) {
        lastMove = [last.from, last.to];
      }
    } else {
      fen = this.chessHistory[0]?.fen() || 'start';
    }

    this.cgApi.set({
      fen: fen,
      lastMove: lastMove,
    });
  }

  goToMove(index: number): void {
    this.currentMoveIndex.set(index);
    this.syncBoard();
  }

  goToStart(): void {
    this.goToMove(-1);
  }

  goToEnd(): void {
    const moveCount = this.game()?.moves?.length || 0;
    this.goToMove(moveCount - 1);
  }

  nextMove(): void {
    const moveCount = this.game()?.moves?.length || 0;
    if (this.currentMoveIndex() < moveCount - 1) {
      this.goToMove(this.currentMoveIndex() + 1);
    }
  }

  prevMove(): void {
    if (this.currentMoveIndex() >= 0) {
      this.goToMove(this.currentMoveIndex() - 1);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') this.nextMove();
    if (event.key === 'ArrowLeft') this.prevMove();
    if (event.key === 'ArrowUp') this.goToStart();
    if (event.key === 'ArrowDown') this.goToEnd();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isResizing) {
      const newSize = Math.max(280, Math.min(1200, event.clientX - this.getBoardOriginX()));
      this.boardSize.set(newSize);
      if (this.cgApi) this.cgApi.redrawAll();
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    if (this.isResizing) {
      this.isResizing = false;
      localStorage.setItem('chess_board_size', this.boardSize().toString());
    }
  }

  private getBoardOriginX(): number {
    const el = this.boardEl()?.nativeElement;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return rect.left;
  }

  startResize(event: MouseEvent) {
    event.preventDefault();
    this.isResizing = true;
  }

  moveRounds() {
    const moves = this.game()?.moves || [];
    const rounds = [];
    for (let i = 0; i < moves.length; i += 2) {
      rounds.push({
        num: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1] || null,
        whiteIndex: i,
        blackIndex: i + 1,
      });
    }
    return rounds;
  }

  getResultClass(game: any): string {
    if (game.result === '1/2-1/2') return 'text-slate-400';
    return game.result === '1-0' ? 'text-green-500' : 'text-red-500';
  }

  onResizeSlider(event: Event) {
    const size = +(event.target as HTMLInputElement).value;
    this.boardSize.set(size);
    localStorage.setItem('chess_board_size', size.toString());
    setTimeout(() => {
      if (this.cgApi) this.cgApi.redrawAll();
    }, 0);
  }
}
