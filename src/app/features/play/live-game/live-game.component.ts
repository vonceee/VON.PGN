import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  computed,
  ChangeDetectorRef,
  PLATFORM_ID,
  viewChild,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, fromEvent } from 'rxjs';
import { GameService } from '../../../core/services/game.service';
import { AudioService } from '../../../core/services/audio.service';
import { Glicko2Service, Glicko2Player } from '../../../core/services/rating.service';
import { UserService } from '../../../core/services/user.service';
import { ChessClockComponent } from '../../../shared/components/chess-clock/chess-clock.component';
import { ServerMaintenanceComponent } from '../../../shared/components/server-maintenance/server-maintenance.component';
import {
  MovePlayedPayload,
  GameEndedPayload,
  DrawOfferedPayload,
  GamePlayer,
  TIME_CONTROLS,
  TimeControlOption,
} from '../../../core/models/game.model';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Key } from 'chessground/types';

@Component({
  selector: 'app-live-game',
  standalone: true,
  imports: [ChessClockComponent, ServerMaintenanceComponent],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-6">
      <div class="max-w-7xl w-full">
        @if (gameService.isServiceMaintenance()) {
          <app-server-maintenance
            title="Chess Service Maintenance"
            message="The chess service is currently undergoing maintenance. Your game will resume automatically when the service is back online."
          ></app-server-maintenance>
        } @else if (game(); as g) {
          <div class="flex flex-col lg:flex-row gap-4 items-start justify-center">
            <!-- Left: Details + PGN viewer + Actions -->
            <div class="w-full lg:w-64 flex flex-col order-3 lg:order-1" [style.height.px]="boardSize()">
              <!-- Game Details -->
              <div class="border border-border-theme rounded p-3 mb-2">
                <div class="text-base flex items-center gap-2 mb-3">
                  @switch (getTimeControlCategory(g.time_control)) {
                    @case ('bullet') {
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    }
                    @case ('blitz') {
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
                      </svg>
                    }
                    @case ('rapid') {
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    }
                  }
                  <span>{{ formatTimeControl(g.time_control) }}</span>
                  <span>•</span>
                  <span>{{ getTimeControlCategoryLabel(g.time_control) }}</span>
                </div>
                <!-- Opponent details -->
                <div class="flex items-center gap-2 text-sm mb-2">
                  <span class="text-xs font-medium">{{ g.my_color === 'white' ? 'Black' : 'White' }}</span>
                  <span>•</span>
                  <span class="truncate">{{ opponentName() }}</span>
                  <span class="text-xs">({{ getOpponentRating() }})</span>
                </div>
                <!-- My details -->
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-xs font-medium">{{ g.my_color === 'white' ? 'White' : 'Black' }}</span>
                  <span>•</span>
                  <span>You</span>
                  <span class="text-xs">({{ getMyRating() }})</span>
                </div>
              </div>

              <!-- PGN Viewer -->
              <div class="flex-1 border border-border-theme rounded-lg p-3 overflow-y-auto">
                <!-- Navigation arrows - full width -->
                <div class="flex items-center justify-between mb-2">
                  <button (click)="goToStart()" class="p-1 hover:opacity-70" title="Start">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="11 17 6 12 11 7" />
                      <polyline points="18 17 13 12 18 7" />
                    </svg>
                  </button>
                  <button (click)="previousMove()" class="p-1 hover:opacity-70" title="Previous">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button (click)="nextMove()" class="p-1 hover:opacity-70" title="Next">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button (click)="goToEnd()" class="p-1 hover:opacity-70" title="End">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="13 17 18 12 13 7" />
                      <polyline points="6 17 11 12 6 7" />
                    </svg>
                  </button>
                </div>
                <!-- Moves list - one pair per line, full width -->
                <div class="text-base font-mono space-y-1">
                  @for (move of g.moves; track $index; let i = $index) {
                    @if (i % 2 === 0) {
                      <div class="flex justify-between items-center">
                        <span class="text-slate-500 w-8 shrink-0">{{ i / 2 + 1 }}.</span>
                        <button 
                          (click)="goToMove(i)"
                          class="hover:opacity-70 px-2 text-left flex-1"
                          [class.font-bold]="currentMoveIndex() === i"
                          [class.underline]="currentMoveIndex() === i"
                        >{{ getMoveSan(i) }}</button>
                        @if (i + 1 < g.moves.length) {
                          <button 
                            (click)="goToMove(i + 1)"
                            class="hover:opacity-70 px-2 text-left flex-1"
                            [class.font-bold]="currentMoveIndex() === i + 1"
                            [class.underline]="currentMoveIndex() === i + 1"
                          >{{ getMoveSan(i + 1) }}</button>
                        } @else {
                          <span class="flex-1"></span>
                        }
                      </div>
                    }
                  }
                </div>
              </div>

              <!-- Action buttons -->
              <div class="mt-2 flex flex-col gap-1.5">
                @if (g.status === 'active') {
                  @if (g.moves.length < 2) {
                    <button (click)="abort()" class="px-3 py-1.5 text-sm border border-border-theme hover:bg-slate-800 rounded">Abort</button>
                  } @else {
                    @if (canOfferDraw()) {
                      <button (click)="offerDraw()" class="px-3 py-1.5 text-sm border border-border-theme hover:bg-slate-800 rounded">Draw</button>
                    }
                    <button (click)="showResignConfirm.set(true)" class="px-3 py-1.5 text-sm border border-red-500/50 hover:bg-red-900/20 rounded">Resign</button>
                  }
                  @if (showResignConfirm()) {
                    <div class="flex gap-1 mt-1">
                      <button (click)="confirmResign()" class="flex-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs">Yes</button>
                      <button (click)="showResignConfirm.set(false)" class="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">No</button>
                    </div>
                  }
                }
                @if (g.status === 'completed' || g.status === 'aborted') {
                  <button (click)="findNewOpponent()" class="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded">New Game</button>
                }
              </div>
            </div>

            <!-- Center: Chess Board -->
            <div class="flex flex-col items-center order-1 lg:order-2">
              <div class="relative">
                <div class="board-wrapper" [style.width.px]="boardSize()">
                  <div #boardEl class="board-container" ngSkipHydration></div>
                </div>
                <div class="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end" (mousedown)="startResize($event)">
                  <svg width="12" height="12" viewBox="0 0 12 12" class="text-slate-500">
                    <path d="M11 11H9.5V9.5H11V11ZM11 7.5H9.5V6H11V7.5ZM7.5 11H6V9.5H7.5V11Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Right: Clocks -->
            <div class="w-full lg:w-48 flex flex-col justify-between order-2 lg:order-3" [style.height.px]="boardSize()">
              <!-- Opponent clock - top -->
              <div class="border border-border-theme rounded p-2">
                <app-chess-clock [serverTimeMs]="opponentTimeMs()" [serverTimestamp]="g.server_timestamp" [isActive]="isOpponentTurn()" (expired)="onClockExpired()" />
              </div>

              <!-- Result message / Alerts in middle -->
              <div>
                @if (g.status === 'completed' || g.status === 'aborted') {
                  <div class="border border-border-theme rounded-lg p-3 text-center mb-2">
                    <div class="text-lg font-bold" [class]="g.status === 'aborted' ? 'text-slate-400' : getResultClass(g.result)">
                      @if (g.status === 'aborted') { Game Aborted } @else { {{ formatResult(g.result) }} }
                    </div>
                    @if (g.status === 'completed') {
                      <div class="text-xs text-slate-400 mt-1">{{ formatTermination(g.result, g.termination) }}</div>
                      @if (ratingChange() !== null) {
                        <div class="text-sm font-medium mt-1" [class]="getRatingChangeClass()">{{ getMyRating() }} ({{ getRatingChangeText() }})</div>
                      }
                    }
                  </div>
                }
                @if (g.status === 'active' && opponentAwayCountdown() !== null) {
                  <div class="border border-red-500/30 rounded-lg p-2 text-center mb-2">
                    <div class="text-xs text-red-400">Opponent disconnected</div>
                    <div class="text-xl font-bold font-mono text-red-400">{{ opponentAwayCountdown() }}</div>
                  </div>
                }
                @if (g.status === 'active' && (bufferCountdown() !== null || abortCountdown() !== null)) {
                  <div class="border border-cyan-500/30 rounded-lg p-2 text-center mb-2">
                    <div class="text-xs text-cyan-400">{{ bufferCountdown() !== null ? 'Game starting' : 'First move' }}</div>
                    <div class="text-xl font-bold font-mono text-cyan-400">{{ bufferCountdown() !== null ? bufferCountdown() : abortCountdown() }}</div>
                  </div>
                }
                @if (g.status === 'active' && drawOfferState() === 'opponentOffered') {
                  <div class="border border-border-theme rounded-lg p-2 mb-2">
                    <div class="text-center text-sm mb-2">Draw offered</div>
                    <div class="flex gap-2">
                      <button (click)="acceptDraw()" class="flex-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs">Accept</button>
                      <button (click)="declineDraw()" class="flex-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs">Decline</button>
                    </div>
                  </div>
                }
                @if (g.status === 'active' && drawOfferState() === 'iOffered') {
                  <div class="border border-border-theme rounded-lg p-2 text-center text-sm text-slate-400 mb-2">Draw sent</div>
                }
                @if (drawCooldownRemaining() > 0) {
                  <div class="text-xs text-slate-500 text-center mb-2">Draw: {{ drawCooldownRemaining() }}s</div>
                }
              </div>

              <!-- My clock - bottom -->
              <div class="border border-border-theme rounded p-2">
                <app-chess-clock [serverTimeMs]="myTimeMs()" [serverTimestamp]="g.server_timestamp" [isActive]="isMyTurn()" (expired)="onClockExpired()" />
              </div>
            </div>
          </div>
        } @else {
          <div class="flex items-center justify-center min-h-100">
            <div class="text-center">
              <div class="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p class="text-slate-400">Loading game...</p>
            </div>
          </div>
        }
      </div>
    </div>

    @if (showExitConfirm()) {
      <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
        <div class="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
          <h3 class="text-lg font-bold mb-2">Leave Game?</h3>
          <p class="text-slate-400 text-sm mb-4">
            You have an active game. Leaving will forfeit the game. Are you sure you want to leave?
          </p>
          <div class="flex gap-2">
            <button
              (click)="confirmExit()"
              class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Yes, Leave
            </button>
            <button
              (click)="showExitConfirm.set(false)"
              class="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .board-wrapper {
        container-type: inline-size;
        aspect-ratio: 1 / 1;
      }
      .board-container {
        width: 100%;
        height: 100%;
        display: block;
        position: relative;
      }
    `,
  ],
})
export class LiveGameComponent implements OnInit, AfterViewInit, OnDestroy {
  boardEl = viewChild<ElementRef<HTMLDivElement>>('boardEl');

  constructor() {
    effect(() => {
      const el = this.boardEl();
      const g = this.game();

      if (el && g) {
        const nativeEl = el.nativeElement;
        if (!this.boardInitialized || nativeEl !== this.lastElement) {
          this.tryInitBoard();
        } else {
          this.syncBoard();
        }
      }
    });
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  gameService = inject(GameService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);
  private ratingService = inject(Glicko2Service);
  private userService = inject(UserService);

  showExitConfirm = signal(false);

  myRating = signal<number>(1500);
  opponentRating = signal<number>(1500);
  ratingChange = signal<number | null>(null);

  private cgApi!: Api;
  private chess = new Chess();
  private chessHistory: Chess[] = [];
  private boardInitialized = false;
  private lastElement: HTMLElement | null = null;
  boardSize = signal(this.loadBoardSize());
  currentMoveIndex = signal(-1);

  private loadBoardSize(): number {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('boardSize');
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= 280 && size <= 560) return size;
      }
    }
    return 400;
  }

  private saveBoardSize(size: number): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('boardSize', size.toString());
    }
  }

  resizeBoard(delta: number) {
    const newSize = this.boardSize() + delta;
    if (newSize >= 280 && newSize <= 560) {
      this.boardSize.set(newSize);
      this.saveBoardSize(newSize);
    }
  }

  onBoardSizeChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.boardSize.set(value);
    this.saveBoardSize(value);
  }

  private resizeStartX = 0;
  private resizeStartSize = 0;
  private isResizing = false;

  startResize(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isResizing = true;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    this.resizeStartX = clientX;
    this.resizeStartSize = this.boardSize();
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.stopResize);
    document.addEventListener('touchmove', this.onTouchResize);
    document.addEventListener('touchend', this.stopResize);
  }

  private onResize = (event: MouseEvent): void => {
    if (!this.isResizing) return;
    const delta = event.clientX - this.resizeStartX;
    const newSize = Math.min(560, Math.max(280, this.resizeStartSize + delta));
    this.boardSize.set(newSize);
  };

  private onTouchResize = (event: TouchEvent): void => {
    if (!this.isResizing || !event.touches.length) return;
    const delta = event.touches[0].clientX - this.resizeStartX;
    const newSize = Math.min(560, Math.max(280, this.resizeStartSize + delta));
    this.boardSize.set(newSize);
  };

  private stopResize = (): void => {
    this.isResizing = false;
    this.saveBoardSize(this.boardSize());
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.stopResize);
    document.removeEventListener('touchmove', this.onTouchResize);
    document.removeEventListener('touchend', this.stopResize);
  };

  private moveSanCache: string[] = [];

  private static readonly ABORT_SECONDS = 15;
  bufferCountdown = computed(() => {
    const g = this.game();
    return g?.bufferCountdown ?? null;
  });

  abortCountdown = signal<number | null>(null);
  private abortInterval: ReturnType<typeof setInterval> | null = null;
  drawOfferState = signal<'none' | 'iOffered' | 'opponentOffered'>('none');
  showResignConfirm = signal(false);
  drawCooldownRemaining = signal<number>(0);
  private drawCooldownInterval: ReturnType<typeof setInterval> | null = null;
  opponentAwayCountdown = this.gameService.opponentAwayCountdown;

  private subs: Subscription[] = [];

  game = this.gameService.gameState;

  isServiceMaintenance = () => this.gameService.isServiceMaintenance();

  myName = () => {
    const g = this.game();
    if (!g) return '';
    return g.my_color === 'white' ? g.white_player.name : g.black_player.name;
  };

  opponentName = () => {
    const g = this.game();
    if (!g) return '';
    return g.my_color === 'white' ? g.black_player.name : g.white_player.name;
  };

  myTimeMs = () => {
    const g = this.game();
    if (!g) return 0;
    return g.my_color === 'white' ? g.white_time_remaining_ms : g.black_time_remaining_ms;
  };

  opponentTimeMs = () => {
    const g = this.game();
    if (!g) return 0;
    return g.my_color === 'white' ? g.black_time_remaining_ms : g.white_time_remaining_ms;
  };

  bufferSecondsRemaining = () => {
    const g = this.game();
    if (!g) return 0;
    // Lichess-style: Buffer is handled entirely client-side
    // We use local buffer countdown which tracks 5-second pre-game buffer
    const bc = this.bufferCountdown();
    return bc !== null ? bc : 0;
  };

  isInBuffer = () => {
    const g = this.game();
    // Buffer is active when server indicates buffer countdown is running
    return g?.bufferCountdown != null && (g?.bufferCountdown ?? 0) > 0;
  };

  isMyTurn = computed(() => {
    const g = this.game();
    if (!g) return false;
    return g.status === 'active' && g.turn === g.my_color;
  });

  isOpponentTurn = computed(() => {
    const g = this.game();
    if (!g) return false;
    return g.status === 'active' && g.turn !== g.my_color;
  });

  isWinner = () => {
    const g = this.game();
    if (!g || g.status !== 'completed' || !g.result) return false;
    if (g.result === '1/2-1/2') return false;
    return (
      (g.result === '1-0' && g.my_color === 'white') ||
      (g.result === '0-1' && g.my_color === 'black')
    );
  };

  isLoser = () => {
    const g = this.game();
    if (!g || g.status !== 'completed' || !g.result) return false;
    if (g.result === '1/2-1/2') return false;
    return (
      (g.result === '0-1' && g.my_color === 'white') ||
      (g.result === '1-0' && g.my_color === 'black')
    );
  };

  isDraw = () => {
    const g = this.game();
    return g?.result === '1/2-1/2';
  };

  isAborted = () => {
    const g = this.game();
    return g?.status === 'aborted';
  };

  hasPendingDrawOffer = () => {
    const g = this.game();
    return (
      g?.status === 'active' && g?.draw_offered_by !== null && g?.draw_offered_by !== undefined
    );
  };

  isDrawOfferedByMe = () => {
    const g = this.game();
    if (!g || !g.draw_offered_by) return false;
    const myUserId = g.my_color === 'white' ? g.white_player.id : g.black_player.id;
    return g.draw_offered_by === myUserId;
  };

  isDrawOfferedByOpponent = () => {
    const g = this.game();
    if (!g || !g.draw_offered_by) return false;
    const myUserId = g.my_color === 'white' ? g.white_player.id : g.black_player.id;
    return g.draw_offered_by !== myUserId;
  };

  needsBuffer = () => {
    const g = this.game();
    if (!g || g.status !== 'active') return false;
    // White needs buffer: no moves yet (buffer before first move)
    if (g.moves.length === 0 && g.my_color === 'white') return true;
    // Black needs buffer: exactly 1 move (White moved, Black's buffer)
    if (g.moves.length === 1 && g.my_color === 'black') return true;
    return false;
  };

  canOfferDraw = () => {
    const g = this.game();
    return (
      g?.status === 'active' &&
      g.moves.length >= 2 && // Standard: both players must move at least once
      !this.hasPendingDrawOffer() &&
      this.drawCooldownRemaining() === 0
    );
  };

  resultLabel = () => {
    if (this.isWinner()) return 'Victory';
    if (this.isLoser()) return 'Defeat';
    if (this.isDraw()) return 'Draw';
    return '';
  };

  formatTimeControl(timeControl: string): string {
    if (!timeControl) return '';
    const match = timeControl.match(/^(\d+)\+(\d+)$/);
    if (match) {
      const minutes = Math.floor(parseInt(match[1], 10) / 60);
      const increment = parseInt(match[2], 10);
      return `${minutes}+${increment}`;
    }
    return timeControl;
  }

  getTimeControlCategoryLabel(timeControl: string): string {
    const tc = TIME_CONTROLS.find((t) => t.value === timeControl);
    if (!tc) return '';
    const category = tc.category;
    if (category === 'bullet') return 'Bullet';
    if (category === 'blitz') return 'Blitz';
    if (category === 'rapid') return 'Rapid';
    return category;
  }

  formatResult(result: string | null): string {
    return result || '';
  }

  formatTermination(result: string | null, termination: string | null): string {
    if (!result || !termination) return '';

    const isDraw = result === '1/2-1/2';
    if (isDraw) {
      if (termination === 'draw') return 'draw';
      if (termination === 'stalemate') return 'draw by stalemate';
      if (termination === 'repetition') return 'draw by repetition';
      if (termination === 'insufficient') return 'draw by insufficient material';
      return 'draw';
    }

    const isWhiteWin = result === '1-0';
    const winner = isWhiteWin ? 'white' : 'black';
    const loser = isWhiteWin ? 'black' : 'white';

    const reason = termination.toLowerCase();
    if (reason === 'checkmate') return `${winner} won through checkmate`;
    if (reason === 'time') return `${loser} ran out of time`;
    if (reason === 'abandoned') return `${loser} abandoned the game`;
    if (reason === 'resignation') return `${loser} resigned`;
    if (reason === 'timeout') return `${loser} ran out of time`;
    return `${winner} won`;
  }

  getMyRating(): number {
    const g = this.game();
    if (!g) return 1500;
    const player = g.my_color === 'white' ? g.white_player : g.black_player;
    return player.rating ?? 1500;
  }

  getOpponentRating(): number {
    const g = this.game();
    if (!g) return 1500;
    const player = g.my_color === 'white' ? g.black_player : g.white_player;
    return player.rating ?? 1500;
  }

  getRatingChangeClass(): string {
    const change = this.ratingChange();
    if (change === null || change === undefined) return '';
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-slate-400';
  }

  getRatingChangeText(): string {
    const change = this.ratingChange();
    if (change === null || change === undefined) return '';
    if (change > 0) return `+${change}`;
    return change.toString();
  }

  getResultClass(result: string | null): string {
    if (!result) return '';
    if (result === '1/2-1/2') return 'text-slate-400';
    const isWinner = (result === '1-0' && this.game()?.my_color === 'white') ||
                     (result === '0-1' && this.game()?.my_color === 'black');
    return isWinner ? 'text-green-400' : 'text-red-400';
  }

  private calculateNewRatings(result: string | null, myColor: 'white' | 'black'): void {
    if (!result) return;

    const g = this.game();
    if (!g) return;

    const timeControl = g.time_control;
    const category = this.getTimeControlCategory(timeControl);
    const user = this.userService.currentUser();
    const currentRating = user?.ratings?.[category]?.rating ?? 1500;
    const currentRd = user?.ratings?.[category]?.rd ?? 200;

    const myPlayer: Glicko2Player = {
      rating: this.getMyRating(),
      rd: currentRd,
      vol: 0.06,
    };

    const oppPlayer: Glicko2Player = {
      rating: this.getOpponentRating(),
      rd: 150,
      vol: 0.06,
    };

    let score: number;
    if (result === '1/2-1/2') {
      score = 0.5;
    } else if (
      (result === '1-0' && myColor === 'white') ||
      (result === '0-1' && myColor === 'black')
    ) {
      score = 1;
    } else {
      score = 0;
    }

    const resultObj = this.ratingService.updateRating(myPlayer, oppPlayer, score);
    this.ratingChange.set(resultObj.change);
    this.myRating.set(resultObj.player.rating);

    this.userService
      .updateLiveChessRating(category, resultObj.player.rating, resultObj.player.rd)
      .subscribe();
  }

  getTimeControlCategory(timeControl: string): 'bullet' | 'blitz' | 'rapid' {
    const tc = TIME_CONTROLS.find((t) => t.value === timeControl);
    return tc?.category ?? 'rapid';
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      if (!this.gameService.gameState()) {
        this.gameService.loadGame(gameId);
      }
    }

    this.subs.push(
      this.gameService.onMovePlayed.subscribe((data) => this.onMovePlayed(data)),
      this.gameService.onGameEnded.subscribe((data) => this.onGameEnded(data)),
      this.gameService.onDrawOffered.subscribe((data) => this.onDrawOffered(data)),
      this.gameService.onPlayerAbsent.subscribe(() => {}),
      this.gameService.onPlayerReturned.subscribe(() => {}),
    );

    this.initDrawOfferState();
    this.setupBeforeUnload();
    this.initOpponentAwayCountdown();
    this.setupKeyboardNavigation();
  }

  private setupKeyboardNavigation(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.subs.push(
        fromEvent<KeyboardEvent>(document, 'keydown').subscribe((event) => {
          // Ignore if user is typing in an input
          if ((event.target as HTMLElement).tagName === 'INPUT') return;
          
          switch (event.key) {
            case 'ArrowLeft':
              this.previousMove();
              break;
            case 'ArrowRight':
              this.nextMove();
              break;
            case 'Home':
              this.goToStart();
              break;
            case 'End':
              this.goToEnd();
              break;
          }
        })
      );
    }
  }

  private initOpponentAwayCountdown(): void {
    const g = this.game();
    if (g && g.opponent_away_countdown !== undefined && g.opponent_away_countdown !== null) {
      this.gameService.opponentAwayCountdown.set(g.opponent_away_countdown);
    }
  }

  private setupBeforeUnload(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private handleBeforeUnload = (event: BeforeUnloadEvent): string | undefined => {
    const g = this.game();
    if (g && g.status === 'active') {
      event.preventDefault();
      return 'You have an active game. Are you sure you want to leave?';
    }
    return undefined;
  };

  ngAfterViewInit(): void {
    // tryInitBoard is now handled by the signal effect
    this.tryStartPreGameCountdown();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.stopResize);
    document.removeEventListener('touchmove', this.onTouchResize);
    document.removeEventListener('touchend', this.stopResize);
    this.subs.forEach((s) => s.unsubscribe());
    this.clearAbortCountdown();
    this.clearDrawCooldown();
    this.cgApi?.destroy();
  }

  private tryInitBoard(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const g = this.game();
    const boardEl = this.boardEl();
    if (!g || !boardEl) return;

    // If we're re-initializing, destroy old instance
    if (this.cgApi && boardEl.nativeElement !== this.lastElement) {
      this.cgApi.destroy();
    }

    try {
      this.chess.load(g.fen);
      this.lastElement = boardEl.nativeElement;

      this.cgApi = Chessground(boardEl.nativeElement, {
        fen: g.fen,
        orientation: g.my_color,
        coordinates: true,
        movable: {
          free: false,
          color: this.isMyTurn() ? g.my_color : undefined,
          dests: this.isMyTurn() ? this.getLegalDestinations(g.legal_moves) : new Map(),
          events: {
            after: (orig, dest) => {
              this.onBoardMove(orig, dest);
            },
          },
        },
        draggable: {
          enabled: g.status === 'active',
          showGhost: true,
        },
        selectable: {
          enabled: false,
        },
        drawable: {
          enabled: true,
        },
      });

      this.boardInitialized = true;
      this.rebuildSanCache();
    } catch (err) {
      console.error('[LiveGame] Board init error:', err);
    }
  }

  private onBoardMove(orig: Key, dest: Key): void {
    const g = this.game();
    if (!g || !this.isMyTurn()) return;

    const moveUci = orig + dest;

    // Check for promotion
    const piece = this.chess.get(orig as any);
    const isPromotion =
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && dest[1] === '8') || (piece.color === 'b' && dest[1] === '1'));

    if (isPromotion) {
      // Default to queen promotion
      const promotionUci = moveUci + 'q';
      this.gameService.sendMove(promotionUci);
    } else {
      this.gameService.sendMove(moveUci);
    }

    // Optimistic update: show the move immediately
    try {
      const move = this.chess.move({ from: orig as string, to: dest as string, promotion: 'q' });
      if (move) {
        this.syncBoard();
      }
    } catch {
      // Revert if the move was invalid locally
      this.chess.load(g.fen);
      this.syncBoard();
    }
  }

  private onMovePlayed(data: MovePlayedPayload): void {
    this.chess.load(data.fen);
    this.syncBoard();
    this.rebuildSanCache();
    // Go to latest position when a new move is played
    const gameState = this.game();
    if (gameState) {
      this.currentMoveIndex.set(gameState.moves.length - 1);
    }

    if (data.is_checkmate) {
      this.audioService.playCheckmate();
    } else if (data.is_check) {
      this.audioService.playCheck();
    } else if (data.is_draw || data.is_stalemate) {
      this.audioService.playDraw();
    } else {
      this.audioService.playMoveSound(data.san);
    }

    if (gameState) {
      // First move made — clear any active abort countdowns
      this.clearAbortCountdown();

      // If White just made their first move, start Black's pre-game buffer
      if (gameState.moves.length === 1 && gameState.my_color === 'black') {
        this.startPreGameCountdown();
      }
    }

    // Clear draw offer state on any move
    this.drawOfferState.set('none');
    this.clearDrawCooldown();

    if (data.is_checkmate || data.is_stalemate || data.is_draw) {
      this.cdr.markForCheck();
    }
  }

  private onGameEnded(data: GameEndedPayload): void {
    if (this.cgApi) {
      this.cgApi.set({
        movable: { color: undefined, dests: new Map() },
      });
    }
    this.drawOfferState.set('none');
    this.clearDrawCooldown();

    const g = this.game();
    if (g) {
      if (g.result === '1/2-1/2') {
        this.audioService.playDraw();
      } else if (
        (g.result === '1-0' && g.my_color === 'white') ||
        (g.result === '0-1' && g.my_color === 'black')
      ) {
        this.audioService.playVictory();
      } else {
        this.audioService.playDefeat();
      }

      if (data.rating_change) {
        const myColor = g.my_color;
        const change = myColor === 'white' ? data.rating_change.white : data.rating_change.black;
        this.ratingChange.set(change);

        const currentRating = this.getMyRating();
        this.myRating.set(currentRating + change);
      } else if (g.result) {
        this.calculateNewRatings(g.result, g.my_color);
      }
    }

    this.cdr.markForCheck();
  }

  private onDrawOffered(data: DrawOfferedPayload): void {
    const g = this.game();
    if (!g) return;
    const myUserId = g.my_color === 'white' ? g.white_player.id : g.black_player.id;
    if (data.offered_by_user_id === myUserId) {
      this.drawOfferState.set('iOffered');
    } else {
      this.drawOfferState.set('opponentOffered');
    }
    this.cdr.markForCheck();
  }

  private initDrawOfferState(): void {
    const g = this.game();
    if (!g || !g.draw_offered_by) return;
    const myUserId = g.my_color === 'white' ? g.white_player.id : g.black_player.id;
    if (g.draw_offered_by === myUserId) {
      this.drawOfferState.set('iOffered');
    } else {
      this.drawOfferState.set('opponentOffered');
    }
  }

  private syncBoard(): void {
    if (!this.cgApi) return;
    const g = this.game();
    if (!g) return;

    const isMyTurn = g.status === 'active' && g.turn === g.my_color;

    const cgConfig: any = {
      fen: this.chess.fen(),
      turnColor: g.turn,
      movable: {
        free: false,
        color: isMyTurn ? g.my_color : undefined,
        dests: isMyTurn ? this.getLegalDestinations(g.legal_moves) : new Map(),
        showDests: true,
      },
      draggable: {
        enabled: g.status === 'active',
        showGhost: true,
      },
      check: this.chess.inCheck() ? g.turn : false,
    };

    this.cgApi.set(cgConfig);
  }

  private getLegalDestinations(legalMoves: string[]): Map<Key, Key[]> {
    const dests = new Map<Key, Key[]>();
    for (const uci of legalMoves) {
      const from = uci.substring(0, 2) as Key;
      const to = uci.substring(2, 4) as Key;
      const list = dests.get(from) || [];
      list.push(to);
      dests.set(from, list);
    }
    return dests;
  }

  private rebuildSanCache(): void {
    const g = this.game();
    if (!g) return;

    this.moveSanCache = [];
    this.chessHistory = [];
    
    // Start from standard initial position
    const tempChess = new Chess();

    // Store initial position
    this.chessHistory.push(new Chess(tempChess.fen()));

    // Rebuild from moves - use reset() to start from beginning
    tempChess.reset();
    for (const uci of g.moves) {
      // Skip empty or invalid UCI
      if (!uci || uci.length < 4) {
        this.moveSanCache.push(uci);
        this.chessHistory.push(new Chess(tempChess.fen()));
        continue;
      }
      
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      
      try {
        const result = tempChess.move({ from, to, promotion: promotion as any });
        if (result) {
          this.moveSanCache.push(result.san);
          this.chessHistory.push(new Chess(tempChess.fen()));
        } else {
          // Move failed, try original UCI format
          this.moveSanCache.push(uci);
          this.chessHistory.push(new Chess(tempChess.fen()));
        }
      } catch (e) {
        // If move fails, try treating as is (for castling etc)
        this.moveSanCache.push(uci);
        this.chessHistory.push(new Chess(tempChess.fen()));
      }
    }
  }

  goToMove(index: number): void {
    const g = this.game();
    if (!g || index < -1 || index >= g.moves.length) return;
    
    this.currentMoveIndex.set(index);
    
    if (index === -1) {
      // Start position
      this.chess.load(
        g.fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
          ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
          : g.fen,
      );
    } else {
      // Go to position after move index
      const pos = this.chessHistory[index + 1];
      if (pos) {
        this.chess.load(pos.fen());
      }
    }
    
    this.updateBoardPosition();
  }

  private updateBoardPosition(): void {
    if (!this.cgApi) return;
    
    const g = this.game();
    if (!g) return;
    
    const isMyTurn = g.status === 'active' && this.currentMoveIndex() === g.moves.length - 1 && g.turn === g.my_color;
    const turnColor = this.chess.turn() === 'w' ? 'white' : 'black';
    const inCheck = this.chess.inCheck();
    
    this.cgApi.set({
      fen: this.chess.fen(),
      turnColor: turnColor,
      movable: {
        free: false,
        color: isMyTurn ? g.my_color : undefined,
        dests: isMyTurn ? this.getLegalDestinations(g.legal_moves) : new Map(),
      },
      draggable: {
        enabled: g.status === 'active' && isMyTurn,
      },
      check: inCheck ? turnColor : false,
    });
  }

  goToStart(): void {
    this.goToMove(-1);
  }

  goToEnd(): void {
    const g = this.game();
    if (g) {
      this.goToMove(g.moves.length - 1);
    }
  }

  previousMove(): void {
    const current = this.currentMoveIndex();
    if (current >= -1) {
      this.goToMove(current - 1);
    }
  }

  nextMove(): void {
    const g = this.game();
    const current = this.currentMoveIndex();
    if (g && current < g.moves.length - 1) {
      this.goToMove(current + 1);
    }
  }

  getMoveSan(index: number): string {
    return this.moveSanCache[index] ?? '';
  }

  resign(): void {
    this.showResignConfirm.set(true);
  }

  confirmResign(): void {
    this.showResignConfirm.set(false);
    this.gameService.resign();
  }

  private startPreGameCountdown(): void {
    // Guard: don't start if countdown already running
    if (this.abortInterval) return;

    const g = this.game();
    if (!g || g.status !== 'active') return;

    // Only start countdown if this player needs buffer:
    // White: no moves yet; Black: exactly 1 move (White just moved)
    const needsBuffer =
      (g.moves.length === 0 && g.my_color === 'white') ||
      (g.moves.length === 1 && g.my_color === 'black');
    if (!needsBuffer) return;

    // Buffer countdown is now handled by the server
  }

  /**
   * Poll until the game state is loaded, then start the pre-game countdown.
   * This handles the async case where loadGame completes after ngAfterViewInit.
   */
  private tryStartPreGameCountdown(): void {
    const g = this.game();
    if (!g) {
      requestAnimationFrame(() => this.tryStartPreGameCountdown());
      return;
    }
    this.startPreGameCountdown();
  }

  private startAbortCountdownIfNeeded(): void {
    const g = this.game();
    if (!g || g.status !== 'active') return;

    // Only start abort if this player hasn't made their first move yet
    const needsAbort =
      (g.moves.length === 0 && g.my_color === 'white') ||
      (g.moves.length === 1 && g.my_color === 'black');
    if (!needsAbort) return;

    this.abortCountdown.set(LiveGameComponent.ABORT_SECONDS);

    this.abortInterval = setInterval(() => {
      const current = this.abortCountdown();
      if (current === null || current <= 0) {
        this.clearAbortCountdown();
        return;
      }
      if (current === 1) {
        this.abortCountdown.set(0);
        this.clearAbortCountdown();
        this.gameService.abortGame();
      } else {
        this.abortCountdown.set(current - 1);
      }
    }, 1000);
  }

  private clearAbortCountdown(): void {
    if (this.abortInterval) {
      clearInterval(this.abortInterval);
      this.abortInterval = null;
    }
    this.abortCountdown.set(null);
  }

  abort(): void {
    this.clearAbortCountdown();
    this.gameService.abortGame();
  }

  onClockExpired(): void {
    const g = this.game();
    if (!g || g.status !== 'active') return;
    this.gameService.syncClock(g.id);
  }

  offerDraw(): void {
    this.gameService.offerDraw();
  }

  acceptDraw(): void {
    this.gameService.acceptDraw();
  }

  declineDraw(): void {
    this.gameService.declineDraw();
    this.drawOfferState.set('none');
    this.startDrawCooldown(30);
  }

  private startDrawCooldown(seconds: number): void {
    this.clearDrawCooldown();
    this.drawCooldownRemaining.set(seconds);
    this.drawCooldownInterval = setInterval(() => {
      const current = this.drawCooldownRemaining();
      if (current <= 1) {
        this.clearDrawCooldown();
      } else {
        this.drawCooldownRemaining.set(current - 1);
      }
    }, 1000);
  }

  private clearDrawCooldown(): void {
    if (this.drawCooldownInterval) {
      clearInterval(this.drawCooldownInterval);
      this.drawCooldownInterval = null;
    }
    this.drawCooldownRemaining.set(0);
  }

  backToLobby(): void {
    this.gameService.clearGame();
    this.router.navigate(['/play']);
  }

  findNewOpponent(): void {
    const g = this.game();
    if (g) {
      this.gameService.clearGame();
      this.gameService.seekGame(g.time_control);
    }
  }

  confirmExit(): void {
    this.showExitConfirm.set(false);
    this.gameService.clearGame();
    this.router.navigate(['/play']);
  }
}
