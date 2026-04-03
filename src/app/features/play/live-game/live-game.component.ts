import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  ChangeDetectorRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../../core/services/game.service';
import { AudioService } from '../../../core/services/audio.service';
import { Glicko2Service, Glicko2Player } from '../../../core/services/rating.service';
import { UserService } from '../../../core/services/user.service';
import { ChessClockComponent } from '../../../shared/components/chess-clock/chess-clock.component';
import { MovePlayedPayload, GameEndedPayload, DrawOfferedPayload, GamePlayer, TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Key } from 'chessground/types';

@Component({
  selector: 'app-live-game',
  standalone: true,
  imports: [ChessClockComponent],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-6">
      <div class="max-w-5xl w-full">
        @if (game(); as g) {
          <div class="flex flex-col lg:flex-row gap-6 items-start justify-center">
            <!-- Left: Opponent clock + Board + Player clock -->
            <div class="flex flex-col items-center gap-3 w-full lg:w-auto">
              <!-- Opponent info + clock -->
              <div class="w-full max-w-140 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold">
                    {{ opponentName().charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-semibold text-sm">{{ opponentName() }}</div>
                    <div class="text-xs text-slate-400">Rating: {{ getOpponentRating() }}</div>
                    <div class="text-xs">{{ g.my_color === 'white' ? 'Black' : 'White' }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs" [style.color]="gameService.isConnected() ? '#22c55e' : '#ef4444'">●</span>
                  <app-chess-clock
                    [serverTimeMs]="opponentTimeMs()"
                    [serverTimestamp]="g.server_timestamp"
                    [isActive]="g.status === 'active' && isOpponentTurn() && !isInBuffer()"
                    [label]="g.my_color === 'white' ? 'Black' : 'White'"
                    (expired)="onClockExpired()"
                  />
                </div>
              </div>

              <!-- Chess Board -->
              <div class="board-wrapper" [style.width.px]="boardSize()">
                <div #boardEl class="board-container"></div>
              </div>
              <input type="range" min="280" max="560" step="40" [value]="boardSize()" (input)="onBoardSizeChange($event)" class="w-full mt-2 accent-cyan-500" />

              <!-- Player info + clock -->
              <div class="w-full max-w-140 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">
                    {{ myName().charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-semibold text-sm">{{ myName() }} (You)</div>
                    <div class="text-xs text-cyan-400">Rating: {{ getMyRating() }}<span [class]="getRatingChangeClass()">{{ getRatingChangeText() }}</span></div>
                    <div class="text-xs">{{ g.my_color === 'white' ? 'White' : 'Black' }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs" [style.color]="gameService.isConnected() ? '#22c55e' : '#ef4444'">{{ gameService.isConnected() ? 'Live' : 'Offline' }}</span>
                  <app-chess-clock
                    [serverTimeMs]="myTimeMs()"
                    [serverTimestamp]="g.server_timestamp"
                    [isActive]="g.status === 'active' && isMyTurn() && !isInBuffer()"
                    [label]="g.my_color === 'white' ? 'White' : 'Black'"
                    (expired)="onClockExpired()"
                  />
                </div>
              </div>
            </div>

            <!-- Right: Game info + controls -->
            <div class="w-full lg:w-64 flex flex-col gap-4">
              <!-- Game status -->
              <div class="border border-border-theme rounded-lg p-4">
                <div class="text-sm">
                  <div class="flex justify-between">
                    <span>{{ formatTimeControl(g.time_control) }}</span>
                  </div>
                </div>
              </div>

              <!-- Result overlay -->
              @if (g.status === 'completed') {
                <div class="border border-border-theme rounded-lg p-4" >
                  <div class="text-center">
                    <div class="text-2xl font-bold mb-1" >
                      {{ formatResult(g.result) }}
                    </div>
                    <div class="text-sm capitalize mb-2">{{ formatTermination(g.result, g.termination) }}</div>
                    @if (ratingChange() !== null) {
                      <div class="text-lg font-semibold" [class]="getRatingChangeClass()">
                        {{ getMyRating() }} <span class="text-sm">({{ getRatingChangeText() }})</span>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (g.status === 'aborted') {
                <div class="rounded-lg p-4 border border-border-theme">
                  <div class="text-center">
                    <div class="text-2xl font-bold mb-1">Game Aborted</div>
                  </div>
                </div>
              }

              <!-- Draw offer notification (opponent offered) -->
              @if (g.status === 'active' && drawOfferState() === 'opponentOffered') {
                <div class="border border-border-theme rounded-lg p-4">
                  <div class="text-center mb-3">
                    <div class="text-sm font-semibold uppercase tracking-wider mb-1">Draw Offered</div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      (click)="acceptDraw()"
                      class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      (click)="declineDraw()"
                      class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              }

              <!-- Draw offer pending indicator (I offered) -->
              @if (g.status === 'active' && drawOfferState() === 'iOffered') {
                <div class="border border-border-theme rounded-lg p-3">
                  <div class="flex items-center justify-center gap-2">
                    <span class="text-sm ">Waiting for {{ opponentName() }} to respond...</span>
                  </div>
                </div>
              }

              <!-- Opponent away countdown -->
              @if (g.status === 'active' && opponentAwayCountdown() !== null) {
                <div class="border border-amber-500/50 rounded-lg p-3 bg-amber-900/20">
                  <div class="text-center">
                    <div class="text-xs uppercase tracking-wider mb-1 text-amber-400">Opponent Away</div>
                    <div class="text-3xl font-bold font-mono text-amber-400">{{ opponentAwayCountdown() }}</div>
                    <div class="text-xs mt-1 text-slate-400">seconds until abandonment</div>
                  </div>
                </div>
              }

              <!-- Move list -->
              <div class="border border-border-theme rounded-lg p-4 max-h-48 overflow-y-auto">
                <div class="text-xs uppercase tracking-wider mb-2">Moves</div>
                <div class="flex flex-wrap gap-1 text-sm">
                  @for (move of g.moves; track $index; let i = $index) {
                    @if (i % 2 === 0) {
                      <span class="mr-1">{{ (i / 2) + 1 }}.</span>
                    }
                    <span class="px-1">{{ getMoveSan(i) }}</span>
                  }
                </div>
              </div>

              <!-- Action buttons -->
              @if (g.status === 'active') {
                <div class="flex flex-col gap-2">
                  @if (bufferCountdown() !== null) {
                    <!-- Pre-game buffer countdown -->
                    <div class="border border-border-theme rounded-lg p-3 text-center">
                      <div class="text-xs uppercase tracking-wider mb-1">Game Starting</div>
                      <div class="text-3xl font-bold font-mono">{{ bufferCountdown() }}</div>
                      <div class="text-xs mt-1">seconds — get settled before the clock starts</div>
                    </div>
                    <button
                      (click)="abort()"
                      class="w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Abort Game
                    </button>
                  }
                  @if (abortCountdown() !== null && bufferCountdown() === null) {
                    <!-- First move timer (after buffer) -->
                    <div class="border border-border-theme rounded-lg p-3 text-center">
                      <div class="text-xs uppercase tracking-wider mb-1">First Move Timer</div>
                      <div class="text-3xl font-bold font-mono">{{ abortCountdown() }}</div>
                      <div class="text-xs mt-1">seconds to make first move</div>
                    </div>
                    <button
                      (click)="abort()"
                      class="w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Abort Game
                    </button>
                  }
                  <button
                    (click)="showResignConfirm.set(true)"
                    class="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    Resign
                  </button>
                  @if (showResignConfirm()) {
                    <div class="border border-red-500/50 rounded-lg p-3 bg-red-900/20">
                      <div class="text-xs text-center mb-2">Resign and forfeit this game?</div>
                      <div class="flex gap-2">
                        <button
                          (click)="confirmResign()"
                          class="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors"
                        >
                          Yes, Resign
                        </button>
                        <button
                          (click)="showResignConfirm.set(false)"
                          class="flex-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  }
                  @if (canOfferDraw()) {
                    <button
                      (click)="offerDraw()"
                      class="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      Offer Draw
                    </button>
                  }
                  @if (drawCooldownRemaining() > 0) {
                    <div class="text-xs text-slate-500 text-center py-1">
                      Draw offer cooldown: {{ drawCooldownRemaining() }}s
                    </div>
                  }
                </div>
              }

              @if (g.status === 'completed' || g.status === 'aborted') {
                <button
                  (click)="findNewOpponent()"
                  class="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  New Opponent
                </button>
              }

              @if (g.status === 'active') {
                <button
                  (click)="showExitConfirm.set(true)"
                  class="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Leave Game
                </button>
              }
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
  styles: [`
    .board-wrapper {
      container-type: inline-size;
    }
    .board-container {
      width: 100%;
      aspect-ratio: 1 / 1;
    }
  `],
})
export class LiveGameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('boardEl') boardEl!: ElementRef<HTMLDivElement>;

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
  private boardInitialized = false;
  boardSize = signal(this.loadBoardSize());

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
  private moveSanCache: string[] = [];
  private static readonly BUFFER_SECONDS = 5;
  private static readonly ABORT_SECONDS = 15;
  bufferCountdown = signal<number | null>(null);
  private bufferInterval: ReturnType<typeof setInterval> | null = null;
  abortCountdown = signal<number | null>(null);
  private abortInterval: ReturnType<typeof setInterval> | null = null;
  drawOfferState = signal<'none' | 'iOffered' | 'opponentOffered'>('none');
  showResignConfirm = signal(false);
  drawCooldownRemaining = signal<number>(0);
  private drawCooldownInterval: ReturnType<typeof setInterval> | null = null;
  opponentAwayCountdown = this.gameService.opponentAwayCountdown;

  private subs: Subscription[] = [];

  game = this.gameService.gameState;

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
    if (!g || g.status !== 'active') return false;
    // Buffer is active when we have a local countdown running
    // Before first move: White has buffer, Black has buffer after White moves
    if (g.moves.length === 0) return this.bufferCountdown() !== null;
    if (g.moves.length === 1 && g.my_color === 'black') return this.bufferCountdown() !== null;
    return false;
  };

  isMyTurn = () => {
    const g = this.game();
    return g?.status === 'active' && g.turn === g.my_color;
  };

  isOpponentTurn = () => {
    const g = this.game();
    return g?.status === 'active' && g.turn !== g.my_color;
  };

  isWinner = () => {
    const g = this.game();
    if (!g || g.status !== 'completed' || !g.result) return false;
    if (g.result === '1/2-1/2') return false;
    return (g.result === '1-0' && g.my_color === 'white') ||
           (g.result === '0-1' && g.my_color === 'black');
  };

  isLoser = () => {
    const g = this.game();
    if (!g || g.status !== 'completed' || !g.result) return false;
    if (g.result === '1/2-1/2') return false;
    return (g.result === '0-1' && g.my_color === 'white') ||
           (g.result === '1-0' && g.my_color === 'black');
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
    return g?.status === 'active' && g?.draw_offered_by !== null && g?.draw_offered_by !== undefined;
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
    return g?.status === 'active'
      && g.moves.length > 0
      && !this.hasPendingDrawOffer()
      && this.drawCooldownRemaining() === 0
      && this.abortCountdown() === null
      && this.bufferCountdown() === null;
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
  };

  formatResult(result: string | null): string {
    return result || '';
  };

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
  };

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
    } else if ((result === '1-0' && myColor === 'white') || (result === '0-1' && myColor === 'black')) {
      score = 1;
    } else {
      score = 0;
    }

    const resultObj = this.ratingService.updateRating(myPlayer, oppPlayer, score);
    this.ratingChange.set(resultObj.change);
    this.myRating.set(resultObj.player.rating);

    this.userService.updateLiveChessRating(category, resultObj.player.rating, resultObj.player.rd).subscribe();
  }

  private getTimeControlCategory(timeControl: string): 'bullet' | 'blitz' | 'rapid' {
    const tc = TIME_CONTROLS.find(t => t.value === timeControl);
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
  }

  ngAfterViewInit(): void {
    this.tryInitBoard();
    this.tryStartPreGameCountdown();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    this.subs.forEach((s) => s.unsubscribe());
    this.clearBufferCountdown();
    this.clearAbortCountdown();
    this.clearDrawCooldown();
    this.cgApi?.destroy();
  }

  private tryInitBoard(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const g = this.game();
    if (!g || !this.boardEl) {
      requestAnimationFrame(() => this.tryInitBoard());
      return;
    }

    try {
      this.chess.load(g.fen);

      this.cgApi = Chessground(this.boardEl.nativeElement, {
        fen: g.fen,
        orientation: g.my_color,
        coordinates: true,
        movable: {
          free: false,
          color: this.isMyTurn() ? g.my_color : undefined,
          dests: this.isMyTurn() ? this.getLegalDestinations(g.legal_moves) : new Map(),
          events: {
            after: (orig, dest) => this.onBoardMove(orig, dest),
          },
        },
        draggable: {
          enabled: g.status === 'active',
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
    const isPromotion = piece &&
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

    if (data.is_checkmate) {
      this.audioService.playCheckmate();
    } else if (data.is_check) {
      this.audioService.playCheck();
    } else if (data.is_draw || data.is_stalemate) {
      this.audioService.playDraw();
    } else {
      this.audioService.playMoveSound(data.san);
    }

    const g = this.game();
    if (g) {
      // First move made — clear any active buffer/abort countdowns
      this.clearBufferCountdown();
      this.clearAbortCountdown();

      // If White just made their first move, start Black's pre-game buffer
      if (g.moves.length === 1 && g.my_color === 'black') {
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
      } else if ((g.result === '1-0' && g.my_color === 'white') ||
                 (g.result === '0-1' && g.my_color === 'black')) {
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

    this.cgApi.set({
      fen: this.chess.fen(),
      turnColor: g.turn,
      movable: {
        color: isMyTurn ? g.my_color : undefined,
        dests: isMyTurn ? this.getLegalDestinations(g.legal_moves) : new Map(),
      },
      check: this.chess.inCheck() ? g.turn : false,
    });
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
    const tempChess = new Chess();
    tempChess.load(g.fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
      ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      : g.fen);

    // Rebuild from moves
    tempChess.reset();
    for (const uci of g.moves) {
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      try {
        const result = tempChess.move({ from, to, promotion: promotion as any });
        if (result) {
          this.moveSanCache.push(result.san);
        }
      } catch {
        this.moveSanCache.push(uci);
      }
    }
  }

  getMoveSan(index: number): string {
    return this.moveSanCache[index] ?? this.game()?.moves[index] ?? '';
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
    if (this.bufferInterval || this.abortInterval) return;

    const g = this.game();
    if (!g || g.status !== 'active') return;

    // Only start countdown if this player needs buffer:
    // White: no moves yet; Black: exactly 1 move (White just moved)
    const needsBuffer = (g.moves.length === 0 && g.my_color === 'white') ||
                        (g.moves.length === 1 && g.my_color === 'black');
    if (!needsBuffer) return;

    this.startBufferCountdown(() => this.startAbortCountdownIfNeeded());
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

  private startBufferCountdown(onComplete: () => void): void {
    this.clearBufferCountdown();
    this.bufferCountdown.set(LiveGameComponent.BUFFER_SECONDS);

    this.bufferInterval = setInterval(() => {
      const current = this.bufferCountdown();
      if (current === null || current <= 0) {
        this.clearBufferCountdown();
        onComplete();
        return;
      }
      this.bufferCountdown.set(current - 1);
    }, 1000);
  }

  private clearBufferCountdown(): void {
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
    this.bufferCountdown.set(null);
  }

  private startAbortCountdownIfNeeded(): void {
    const g = this.game();
    if (!g || g.status !== 'active') return;

    // Only start abort if this player hasn't made their first move yet
    const needsAbort = (g.moves.length === 0 && g.my_color === 'white') ||
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
    this.clearBufferCountdown();
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
