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
import { ChessClockComponent } from '../../../shared/components/chess-clock/chess-clock.component';
import { MovePlayedPayload, GameEndedPayload, DrawOfferedPayload } from '../../../core/models/game.model';
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
                    <div class="text-xs">{{ g.my_color === 'white' ? 'Black' : 'White' }}</div>
                  </div>
                  @if (isOpponentTurn()) {
                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1"></span>
                  }
                </div>
                <app-chess-clock
                  [serverTimeMs]="opponentTimeMs()"
                  [serverTimestamp]="g.server_timestamp"
                  [isActive]="g.status === 'active' && isOpponentTurn() && bufferCountdown() === null"
                  [label]="g.my_color === 'white' ? 'Black' : 'White'"
                  (expired)="onClockExpired()"
                />
              </div>

              <!-- Chess Board -->
              <div class="board-wrapper" [style.width.px]="boardSize">
                <div #boardEl class="board-container"></div>
              </div>

              <!-- Player info + clock -->
              <div class="w-full max-w-140 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">
                    {{ myName().charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-semibold text-sm">{{ myName() }} (You)</div>
                    <div class="text-xs">{{ g.my_color === 'white' ? 'White' : 'Black' }}</div>
                  </div>
                  @if (isMyTurn()) {
                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1"></span>
                  }
                </div>
                <app-chess-clock
                  [serverTimeMs]="myTimeMs()"
                  [serverTimestamp]="g.server_timestamp"
                  [isActive]="g.status === 'active' && isMyTurn() && bufferCountdown() === null"
                  [label]="g.my_color === 'white' ? 'White' : 'Black'"
                  (expired)="onClockExpired()"
                />
              </div>
            </div>

            <!-- Right: Game info + controls -->
            <div class="w-full lg:w-64 flex flex-col gap-4">
              <!-- Game status -->
              <div class="border border-border-theme rounded-lg p-4">
                <div class="text-sm">
                  <div class="flex justify-between mb-1">
                    <span>{{ g.time_control }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Status</span>
                    <span>{{ g.status }}</span>
                  </div>
                </div>
              </div>

              <!-- Result overlay -->
              @if (g.status === 'completed') {
                <div class="border border-border-theme rounded-lg p-4" >
                  <div class="text-center">
                    <div class="text-2xl font-bold mb-1" >
                      {{ resultLabel() }}
                    </div>
                    <div class="text-sm capitalize">{{ g.termination }}</div>
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
                    (click)="resign()"
                    class="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Resign
                  </button>
                  @if (canOfferDraw()) {
                    <button
                      (click)="offerDraw()"
                      class="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
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
                  (click)="backToLobby()"
                  class="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  New Game
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

  private cgApi!: Api;
  private chess = new Chess();
  private boardInitialized = false;
  boardSize = 560;
  private moveSanCache: string[] = [];
  private static readonly BUFFER_SECONDS = 5;
  private static readonly ABORT_SECONDS = 15;
  bufferCountdown = signal<number | null>(null);
  private bufferInterval: ReturnType<typeof setInterval> | null = null;
  abortCountdown = signal<number | null>(null);
  private abortInterval: ReturnType<typeof setInterval> | null = null;
  drawOfferState = signal<'none' | 'iOffered' | 'opponentOffered'>('none');
  drawCooldownRemaining = signal<number>(0);
  private drawCooldownInterval: ReturnType<typeof setInterval> | null = null;

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
    );

    this.initDrawOfferState();
  }

  ngAfterViewInit(): void {
    this.tryInitBoard();
    this.tryStartPreGameCountdown();
  }

  ngOnDestroy(): void {
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

  private onGameEnded(_data: GameEndedPayload): void {
    if (this.cgApi) {
      this.cgApi.set({
        movable: { color: undefined, dests: new Map() },
      });
    }
    this.drawOfferState.set('none');
    this.clearDrawCooldown();
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
    if (confirm('Are you sure you want to resign?')) {
      this.gameService.resign();
    }
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
}
