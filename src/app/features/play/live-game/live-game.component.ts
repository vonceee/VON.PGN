import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
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
import { UserService } from '../../../core/services/user.service';
import { ArenaService } from '../../../core/services/arena.service';
import { ChessClockComponent } from '../../../shared/components/chess-clock/chess-clock.component';
import { ServerMaintenanceComponent } from '../../../shared/components/server-maintenance/server-maintenance.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { GameInfoComponent } from './components/game-info.component';
import { MoveHistoryComponent } from './components/move-history.component';
import { GameControlsComponent } from './components/game-controls.component';
import {
  MovePlayedPayload,
  GameEndedPayload,
  DrawOfferedPayload,
  RematchOfferedPayload,
  RematchAcceptedPayload,
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
  imports: [
    ChessClockComponent,
    ServerMaintenanceComponent,
    GameInfoComponent,
    MoveHistoryComponent,
    GameControlsComponent,
  ],
  template: `
    <div class="min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] md:overflow-hidden flex items-center justify-center p-2 md:p-4">
      <div class="w-full max-w-[1500px]">
        @if (gameService.isServiceMaintenance()) {
          <app-server-maintenance
            title="Chess Service Maintenance"
            message="The chess service is currently undergoing maintenance. Your game will resume automatically when the service is back online."
          ></app-server-maintenance>
        } @else if (game(); as g) {
          <div class="flex flex-col md:flex-row gap-4 md:gap-8 xl:gap-10 items-start justify-center">
            <!-- Left: Details + PGN viewer + Actions (hidden on mobile, visible on md+) -->
            <div
              class="hidden md:flex w-full md:w-[400px] flex-col order-3 md:order-1 premium-card rounded-xl overflow-hidden"
              [style.height.px]="boardSize()"
            >
              <div class="p-4 border-b border-border-theme">
                <!-- Opponent details -->
                <app-game-info 
                  [player]="g.my_color === 'white' ? g.black_player : g.white_player"
                  [color]="g.my_color === 'white' ? 'black' : 'white'"
                  [ratingChange]="getOpponentRatingChange()"
                  class="block mb-3"
                />

                <!-- My details -->
                <app-game-info 
                  [player]="g.my_color === 'white' ? g.white_player : g.black_player"
                  [color]="g.my_color"
                  [ratingChange]="getMyRatingChange()"
                />
              </div>

              <!-- PGN Viewer -->
              <app-move-history 
                class="flex-1"
                [rounds]="moveRounds()"
                [currentMoveIndex]="currentMoveIndex()"
                [totalMoves]="g.moves.length"
                (navigate)="goToMove($event)"
              />

              <!-- Action buttons -->
              <app-game-controls
                [game]="g"
                [canOfferDraw]="canOfferDraw()"
                [drawOfferFromOpponent]="drawOfferState() === 'opponentOffered'"
                [iOfferedDraw]="drawOfferState() === 'iOffered'"
                [myRematchOffered]="myRematchOffered()"
                [rematchOfferFrom]="rematchOfferFrom()"
                (abort)="abort()"
                (offerDraw)="offerDraw()"
                (acceptDraw)="acceptDraw()"
                (declineDraw)="declineDraw()"
                (resign)="confirmResign()"
                (offerRematch)="offerRematch()"
                (acceptRematch)="acceptRematch()"
                (declineRematch)="declineRematch()"
                (newOpponent)="findNewOpponent()"
              />
            </div>

            <!-- Center: Chess Board Area -->
            <div class="flex flex-col items-center order-1 md:order-2 w-full md:w-auto">
              <!-- Mobile: Opponent info + clock above board -->
              <div class="w-full md:hidden mb-2 flex items-center justify-between gap-2 px-1">
                <app-game-info 
                  [player]="g.my_color === 'white' ? g.black_player : g.white_player"
                  [color]="g.my_color === 'white' ? 'black' : 'white'"
                  [ratingChange]="getOpponentRatingChange()"
                  class="flex-1 min-w-0"
                />
                <app-chess-clock
                  class="shrink-0"
                  [serverTimeMs]="opponentTimeMs()"
                  [serverTimestamp]="g.server_timestamp"
                  [isActive]="isOpponentTurn()"
                  (expired)="onClockExpired()"
                />
              </div>
              
              <div class="relative">
                <div class="board-wrapper premium-card" [class.premium-card-pulse]="isMyTurn() && g.status === 'active'" [style.width.px]="boardSize()">
                  <div #boardEl class="board-container" ngSkipHydration></div>
                </div>
                <div
                  class="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end"
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
              
              <!-- Mobile: My info + clock below board -->
              <div class="w-full md:hidden mt-2 flex items-center justify-between gap-2 px-1">
                <app-game-info 
                  [player]="g.my_color === 'white' ? g.white_player : g.black_player"
                  [color]="g.my_color"
                  [ratingChange]="getMyRatingChange()"
                  class="flex-1 min-w-0"
                />
                <app-chess-clock
                  class="shrink-0"
                  [serverTimeMs]="myTimeMs()"
                  [serverTimestamp]="g.server_timestamp"
                  [isActive]="isMyTurn()"
                  (expired)="onClockExpired()"
                />
              </div>


              <!-- Mobile: Status Messages / Results -->
              <div class="md:hidden w-full mt-4 empty:hidden">
                @if (g.status === 'completed' || g.status === 'aborted') {
                  <div class="premium-card rounded-lg p-3 text-center mb-3">
                    <div class="text-lg font-bold" [class]="g.status === 'aborted' ? 'text-slate-400' : getResultClass(g.result)">
                      {{ g.status === 'aborted' ? (formatTermination(null, g.termination) || 'Game Aborted') : formatResult(g.result) }}
                    </div>
                    @if (g.status === 'completed') {
                      <div class="text-xs text-slate-400 mt-0.5">{{ formatTermination(g.result, g.termination) }}</div>
                    }
                  </div>
                }
                @if (g.status === 'active' && (opponentAwayCountdown() !== null || abortCountdown() !== null)) {
                  <div class="flex gap-3 justify-center mb-3">
                    @if (opponentAwayCountdown() !== null) {
                      <div class="border border-red-500/30 rounded-lg py-1.5 px-4 text-center">
                        <div class="text-[10px] uppercase tracking-wider text-red-400 opacity-70">Opponent away</div>
                        <div class="text-lg font-bold font-mono text-red-400">{{ opponentAwayCountdown() }}</div>
                      </div>
                    }
                    @if (abortCountdown() !== null) {
                      <div class="border border-cyan-500/30 rounded-lg py-1.5 px-4 text-center">
                        <div class="text-[10px] uppercase tracking-wider text-cyan-400 opacity-70">Abort timer</div>
                        <div class="text-lg font-bold font-mono text-cyan-400">{{ abortCountdown() }}</div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Mobile: Move History + Controls Area -->
              <div class="md:hidden w-full mt-2 flex flex-col gap-3 premium-card rounded-xl overflow-hidden max-h-[300px]">
                <app-move-history 
                  class="h-[180px] border-b border-border-theme"
                  [rounds]="moveRounds()"
                  [currentMoveIndex]="currentMoveIndex()"
                  [totalMoves]="g.moves.length"
                  (navigate)="goToMove($event)"
                />
                
                <app-game-controls
                  class="pb-2"
                  [game]="g"
                  [canOfferDraw]="canOfferDraw()"
                  [drawOfferFromOpponent]="drawOfferState() === 'opponentOffered'"
                  [iOfferedDraw]="drawOfferState() === 'iOffered'"
                  [myRematchOffered]="myRematchOffered()"
                  [rematchOfferFrom]="rematchOfferFrom()"
                  (abort)="abort()"
                  (offerDraw)="offerDraw()"
                  (acceptDraw)="acceptDraw()"
                  (declineDraw)="declineDraw()"
                  (resign)="confirmResign()"
                  (offerRematch)="offerRematch()"
                  (acceptRematch)="acceptRematch()"
                  (declineRematch)="declineRematch()"
                  (newOpponent)="findNewOpponent()"
                />
              </div>
            </div>

            <!-- Right: Clocks (hidden on mobile, visible on md+) -->
            <div
              class="hidden md:flex w-full md:w-44 flex-col justify-between order-2 md:order-3"
              [style.height.px]="boardSize()"
            >
              <!-- Opponent clock - top -->
              <div class="premium-card rounded p-2">
                <app-chess-clock
                  [serverTimeMs]="opponentTimeMs()"
                  [serverTimestamp]="g.server_timestamp"
                  [isActive]="isOpponentTurn()"
                  (expired)="onClockExpired()"
                />
              </div>

              <!-- Result message / Alerts in middle -->
              <div class="flex-1 flex flex-col justify-center py-4">
                @if (g.status === 'completed' || g.status === 'aborted') {
                  <div class="premium-card rounded-lg p-3 text-center mb-2">
                    <div
                      class="text-lg font-bold"
                      [class]="g.status === 'aborted' ? 'text-slate-400' : getResultClass(g.result)"
                    >
                        @if (g.status === 'aborted') {
                        {{ formatTermination(null, g.termination) || 'Game Aborted' }}
                      } @else {
                        {{ formatResult(g.result) }}
                      }
                    </div>
                    @if (g.status === 'completed') {
                      <div class="text-xs text-slate-400 mt-0.5">
                        {{ formatTermination(g.result, g.termination) }}
                      </div>
                    }
                  </div>
                }

                @if (g.status === 'active' && opponentAwayCountdown() !== null) {
                  <div class="border border-red-500/30 rounded-lg p-2 text-center mb-2">
                    <div class="text-xs text-red-400">Opponent disconnected</div>
                    <div class="text-xl font-bold font-mono text-red-400">
                      {{ opponentAwayCountdown() }}
                    </div>
                  </div>
                }
                @if (g.status === 'active' && abortCountdown() !== null) {
                  <div class="border border-cyan-500/30 rounded-lg p-2 text-center mb-2">
                    <div class="text-xs text-cyan-400">First move</div>
                    <div class="text-xl font-bold font-mono text-cyan-400">
                      {{ abortCountdown() }}
                    </div>
                  </div>
                }
              </div>

              <!-- My clock - bottom -->
              <div class="premium-card rounded p-2">
                <app-chess-clock
                  [serverTimeMs]="myTimeMs()"
                  [serverTimestamp]="g.server_timestamp"
                  [isActive]="isMyTurn()"
                  (expired)="onClockExpired()"
                />
              </div>
            </div>
          </div>
        } @else {
          <div class="flex items-center justify-center min-h-[400px]">
            <div class="text-center">
              <div
                class="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              ></div>
              <p class="text-slate-500 text-sm">Loading game...</p>
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
              class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500  rounded-lg text-sm font-semibold transition-colors"
            >
              Yes, Leave
            </button>
            <button
              (click)="showExitConfirm.set(false)"
              class="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500  rounded-lg text-sm font-semibold transition-colors"
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
export class LiveGameComponent implements OnInit, OnDestroy {
  boardEl = viewChild<ElementRef<HTMLDivElement>>('boardEl');
  public arenaService = inject(ArenaService);

  constructor() {
    effect(() => {
      const el = this.boardEl();
      const g = this.game();
      
      // Auto-return to Arena logic
      if (g?.status === 'completed' && g?.arena_id && !this.autoReturnTriggered) {
        this.autoReturnTriggered = true;
        setTimeout(() => this.backToArena(), 5000);
      }

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
  private userService = inject(UserService);

  showExitConfirm = signal(false);
  private autoReturnTriggered = false;

  myRating = signal<number>(1500);
  opponentRating = signal<number>(1500);
  ratingChange = signal<number | null>(null);
  
  rematchOfferFrom = signal<string | null>(null);
  myRematchOffered = signal<boolean>(false);

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
        if (size >= 280 && size <= 1200) return size;
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
    const dynamicMax = Math.min(1200, window.innerWidth * 0.95, window.innerHeight * 0.85);
    const newSize = this.boardSize() + delta;
    if (newSize >= 280 && newSize <= dynamicMax) {
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
    const dynamicMax = Math.min(1200, window.innerWidth * 0.95, window.innerHeight * 0.85);
    const newSize = Math.min(dynamicMax, Math.max(280, this.resizeStartSize + delta));
    this.boardSize.set(newSize);
  };

  private onTouchResize = (event: TouchEvent): void => {
    if (!this.isResizing || !event.touches.length) return;
    const delta = event.touches[0].clientX - this.resizeStartX;
    const dynamicMax = Math.min(1200, window.innerWidth * 0.95, window.innerHeight * 0.85);
    const newSize = Math.min(dynamicMax, Math.max(280, this.resizeStartSize + delta));
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

  abortCountdown = signal<number | null>(null);
  private abortInterval: ReturnType<typeof setInterval> | null = null;
  drawOfferState = signal<'none' | 'iOffered' | 'opponentOffered'>('none');
  showResignConfirm = signal(false);
  opponentAwayCountdown = this.gameService.opponentAwayCountdown;

  private subs: Subscription[] = [];

  game = this.gameService.gameState;

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

  getMyRating(): number {
    const g = this.game();
    if (!g) return 1500;
    const player = g.my_color === 'white' ? g.white_player : g.black_player;
    return player.rating ?? 1500;
  }

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

  moveRounds = computed(() => {
    const g = this.game();
    if (!g) return [];
    const rounds = [];
    for (let i = 0; i < g.moves.length; i += 2) {
      rounds.push({
        num: Math.floor(i / 2) + 1,
        white: this.moveSanCache[i] ?? g.moves[i],
        black: i + 1 < g.moves.length ? (this.moveSanCache[i+1] ?? g.moves[i+1]) : null,
        whiteIndex: i,
        blackIndex: i + 1,
      });
    }
    return rounds;
  });

  canOfferDraw = () => {
    const g = this.game();
    return (
      g?.status === 'active' &&
      g.moves.length >= 2 &&
      this.drawOfferState() === 'none'
    );
  };

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
    if (!termination) return '';

    const isDraw = result === '1/2-1/2';
    if (isDraw) {
      if (termination === 'draw') return 'draw';
      if (termination === 'stalemate') return 'draw by stalemate';
      if (termination === 'repetition') return 'draw by repetition';
      if (termination === 'insufficient') return 'draw by insufficient material';
      return 'draw';
    }

    if (termination && termination.startsWith('aborted')) {
      if (termination === 'aborted_white') return 'aborted by white';
      if (termination === 'aborted_black') return 'aborted by black';
      if (termination === 'aborted_server') return 'aborted by server';
      return 'game aborted';
    }

    if (!result) return '';

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

  getOpponentRatingChange(): number | null {
    const g = this.game();
    if (!g || g.status !== 'completed') return null;
    return g.my_color === 'white' ? g.black_rating_change : g.white_rating_change;
  }

  getMyRatingChange(): number | null {
    const g = this.game();
    if (!g || g.status !== 'completed') return null;
    return g.my_color === 'white' ? g.white_rating_change : g.black_rating_change;
  }

  getResultClass(result: string | null): string {
    if (!result) return '';
    if (result === '1/2-1/2') return 'text-slate-400';
    return '';
  }

  ngOnInit(): void {
    // Subscribe to route params to handle rematch navigation properly
    this.subs.push(
      this.route.paramMap.subscribe((params) => {
        const gameId = params.get('gameId');
        if (gameId) {
          // Reset rematch state for new game session
          this.rematchOfferFrom.set(null);
          this.myRematchOffered.set(false);
          
          if (!this.gameService.gameState()) {
            this.gameService.loadGame(gameId);
          }
        }
      })
    );

    this.subs.push(
      this.gameService.onMovePlayed.subscribe((data) => this.onMovePlayed(data)),
      this.gameService.onGameEnded.subscribe((data) => this.onGameEnded(data)),
      this.gameService.onDrawOffered.subscribe((data) => this.onDrawOffered(data)),
      this.gameService.onRematchOffered.subscribe((data) => this.handleRematchOffer(data)),
      this.gameService.onRematchAccepted.subscribe((data) => this.handleRematchAccepted(data)),
      this.gameService.onRematchDeclined.subscribe(() => this.handleRematchDeclined()),
      this.gameService.onDrawDeclined.subscribe(() => this.onDrawDeclined()),
      this.gameService.onPlayerAbsent.subscribe(() => {}),
      this.gameService.onPlayerReturned.subscribe(() => {}),
    );

    this.initDrawOfferState();
    this.setupBeforeUnload();
    this.initOpponentAwayCountdown();
    this.setupKeyboardNavigation();
    this.setupWindowResizeListener();
  }

  private setupWindowResizeListener(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.subs.push(
        fromEvent(window, 'resize').subscribe(() => {
          this.capBoardSize();
        })
      );
      // Initial cap
      this.capBoardSize();
    }
  }

  private capBoardSize(): void {
    const dynamicMax = Math.min(1200, window.innerWidth * 0.95, window.innerHeight * 0.85);
    if (this.boardSize() > dynamicMax) {
      this.boardSize.set(dynamicMax);
    }
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
        }),
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
    if (!data.fen) {
      if (data.status === 'aborted') {
        this.clearAbortCountdown();
        this.cdr.markForCheck();
      }
      return;
    }

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

      // If White just made their first move, we can do extra logic here if needed
      if (gameState.moves.length === 1 && gameState.my_color === 'black') {
        // ...
      }
    }

    this.drawOfferState.set('none');


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
      }
    }

    this.cdr.markForCheck();
  }

  private onDrawOffered(data: DrawOfferedPayload): void {
    const g = this.game();
    if (!g) return;
    const myUserId = g.my_color === 'white' ? g.white_player.id : g.black_player.id;
    if (data.offeredByUserId === myUserId) {
      this.drawOfferState.set('iOffered');
    } else {
      this.drawOfferState.set('opponentOffered');
    }
    this.cdr.markForCheck();
  }

  private onDrawDeclined(): void {
    this.drawOfferState.set('none');
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

    const isMyTurn =
      g.status === 'active' &&
      this.currentMoveIndex() === g.moves.length - 1 &&
      g.turn === g.my_color;
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
    this.drawOfferState.set('iOffered');
    this.gameService.offerDraw();
  }

  acceptDraw(): void {
    this.gameService.acceptDraw();
  }

  declineDraw(): void {
    this.gameService.declineDraw();
    this.drawOfferState.set('none');
  }



  backToLobby(): void {
    this.gameService.clearGame();
    this.router.navigate(['/play']);
  }

  offerRematch(): void {
    const g = this.game();
    if (!g) return;
    this.myRematchOffered.set(true);
    this.gameService.offerRematch();
  }

  acceptRematch(): void {
    this.gameService.acceptRematch();
  }

  declineRematch(): void {
    this.rematchOfferFrom.set(null);
    this.gameService.declineRematch();
  }

  private handleRematchOffer(data: RematchOfferedPayload): void {
    const g = this.game();
    if (!g || data.gameId !== g.id) return;
    this.rematchOfferFrom.set(data.offeredBy);
    this.audioService.playNotification();
  }

  private handleRematchAccepted(data: RematchAcceptedPayload): void {
    const g = this.game();
    if (!g || data.oldGameId !== g.id) return;
    
    // Smooth transition to new game (don't let clearGame navigate since we're doing it manually)
    this.gameService.clearGame(false);
    this.router.navigate(['/play', data.newGameId]);
  }

  private handleRematchDeclined(): void {
    this.myRematchOffered.set(false);
  }

  findNewOpponent(): void {
    const g = this.game();
    if (g) {
      this.gameService.clearGame();
      this.gameService.seekGame(g.time_control);
    }
  }

  backToArena(): void {
    const g = this.game();
    if (g?.arena_id) {
      this.gameService.clearGame();
      this.router.navigate(['/events', g.arena_id, 'arena']);
      // Re-join pairing immediately for the next match
      setTimeout(() => {
        this.arenaService.startPairing();
      }, 500);
    }
  }

  confirmExit(): void {
    this.showExitConfirm.set(false);
    this.gameService.clearGame();
    this.router.navigate(['/play']);
  }
}
