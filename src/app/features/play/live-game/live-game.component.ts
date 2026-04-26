import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  PLATFORM_ID,
  viewChild,
  effect,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { fromEvent } from 'rxjs';
import { GameService } from '../../../core/services/game.service';
import { AudioService } from '../../../core/services/audio.service';
import { ArenaService } from '../../../core/services/arena.service';
import { ChessClockComponent } from '@shared/chess';
import { LoadingComponent } from '@shared/feedback';
import { ButtonComponent } from '@shared/ui';
import { GameInfoComponent } from './components/game-info.component';
import { GameControlsComponent } from './components/game-controls.component';
import { ChessBoardComponent } from '@shared/chess';
import { MoveNotationComponent } from '@shared/chess';
import {
  MovePlayedPayload,
  GameEndedPayload,
  DrawOfferedPayload,
  RematchOfferedPayload,
  RematchAcceptedPayload,
  TIME_CONTROLS,
} from '../../../core/models/game.model';
import { Chess, Move } from 'chess.js';
import { Config } from 'chessground/config';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChevronDoubleLeft,
  heroChevronLeft,
  heroChevronRight,
  heroChevronDoubleRight,
  heroInformationCircle,
  heroXMark,
  heroCheck,
  heroArrowPath,
  heroPlus,
  heroFlag,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-live-game',
  standalone: true,
  imports: [
    ChessClockComponent,
    GameInfoComponent,
    MoveNotationComponent,
    GameControlsComponent,
    ChessBoardComponent,
    ButtonComponent,
    LoadingComponent,
    NgIcon,
  ],
  providers: [
    provideIcons({
      heroChevronDoubleLeft,
      heroChevronLeft,
      heroChevronRight,
      heroChevronDoubleRight,
      heroInformationCircle,
      heroXMark,
      heroCheck,
      heroArrowPath,
      heroPlus,
      heroFlag,
    }),
  ],
  templateUrl: './live-game.component.html',
  host: {
    class: 'absolute inset-0 overflow-hidden',
  },
})
export class LiveGameComponent implements OnInit, OnDestroy {
  public arenaService = inject(ArenaService);

  constructor() {
    effect(() => {
      const g = this.game();

      if (g && !this.boardInitialized) {
        this.boardInitialized = true;
        this.chess.load(g.fen);
        this.displayFen.set(this.chess.fen());
        this.currentPly.set(g.moves.length);
        this.rebuildSanCache();
        this.audioService.playBoardStart();
      }

      // Update CSS variable for layout sizing
      if (isPlatformBrowser(this.platformId)) {
        const size = this.boardSize();
        document.documentElement.style.setProperty('--board-size', `${size}px`);
      }
    });
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  gameService = inject(GameService);
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);
  private destroyRef = inject(DestroyRef);
  board = viewChild(ChessBoardComponent);

  showExitConfirm = signal(false);
  private autoReturnTriggered = false;

  myRating = signal<number>(1500);
  opponentRating = signal<number>(1500);
  ratingChange = signal<number | null>(null);

  rematchOfferFrom = signal<string | null>(null);
  myRematchOffered = signal<boolean>(false);

  chess = new Chess();
  displayFen = signal<string>('');
  private chessHistory: Chess[] = [];
  private boardInitialized = false;
  boardSize = signal(this.loadBoardSize());
  currentPly = signal(0);
  showMobileResult = signal(true);

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

  onBoardSizeChange(event: number) {
    this.boardSize.set(event);
  }

  moveSanCache = signal<string[]>([]);
  private static readonly ABORT_SECONDS = 15;
  abortCountdown = signal<number | null>(null);
  private abortInterval: ReturnType<typeof setInterval> | null = null;
  drawOfferState = signal<'none' | 'iOffered' | 'opponentOffered'>('none');
  showResignConfirm = signal(false);
  opponentAwayCountdown = this.gameService.opponentAwayCountdown;
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
    const isLatest = this.currentPly() === g.moves.length;
    return g.status === 'active' && isLatest && g.turn === g.my_color;
  });

  isOpponentTurn = computed(() => {
    const g = this.game();
    if (!g) return false;
    const isLatest = this.currentPly() === g.moves.length;
    return g.status === 'active' && isLatest && g.turn !== g.my_color;
  });

  moveRounds = computed(() => {
    const g = this.game();
    const san = this.moveSanCache();
    if (!g) return [];
    const rounds = [];
    for (let i = 0; i < g.moves.length; i += 2) {
      rounds.push({
        num: Math.floor(i / 2) + 1,
        white: san[i] ?? g.moves[i],
        black: i + 1 < g.moves.length ? (san[i + 1] ?? g.moves[i + 1]) : null,
        whiteIndex: i,
        blackIndex: i + 1,
      });
    }
    return rounds;
  });

  canOfferDraw = () => {
    const g = this.game();
    return g?.status === 'active' && g.moves.length >= 2 && this.drawOfferState() === 'none';
  };

  cgConfig = computed(() => {
    const g = this.game();
    const currentIdx = this.currentPly();
    if (!g) return {};

    return {
      turnColor: g.turn,
      movable: {
        color: this.isMyTurn() || this.isOpponentTurn() ? g.my_color : undefined,
        dests: this.isMyTurn() ? this.getLegalDestinations(g.legal_moves) : undefined,
      },
      check: this.chess.inCheck() ? (this.chess.turn() === 'w' ? 'white' : 'black') : undefined,
    } as Config;
  });

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
    if (!result) return '';
    if (result === '1-0') return 'white won';
    if (result === '0-1') return 'black won';
    if (result === '1/2-1/2') return 'draw';
    return result.toLowerCase();
  }

  formatTermination(result: string | null, termination: string | null): string {
    if (!termination) return '';
    const isDraw = result === '1/2-1/2';
    if (isDraw) {
      if (termination === 'draw') return 'by mutual agreement';
      if (termination === 'stalemate') return 'by stalemate';
      if (termination === 'repetition') return 'by 3-fold repetition';
      if (termination === 'insufficient') return 'by insufficient material';
      if (termination === 'timeout') return 'by timeout vs insufficient material';
      return termination.toLowerCase();
    }
    if (termination && termination.startsWith('aborted')) {
      if (termination === 'aborted_white') return 'aborted by white';
      if (termination === 'aborted_black') return 'aborted by black';
      if (termination === 'aborted_server') return 'aborted by server';
      return 'game aborted';
    }
    if (!result) return '';
    const isWhiteWin = result === '1-0';
    const loser = isWhiteWin ? 'black' : 'white';
    const reason = termination.toLowerCase();
    
    if (reason === 'checkmate') return `by checkmate`;
    if (reason === 'time' || reason === 'timeout') return `${loser} ran out of time`;
    if (reason === 'abandoned') return `${loser} abandoned the game`;
    if (reason === 'resignation' || reason === 'resigned') return `${loser} resigned`;
    
    return reason;
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
    return result === '1/2-1/2' ? 'text-slate-400' : '';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const gameId = params.get('gameId');
      if (gameId) {
        this.rematchOfferFrom.set(null);
        this.myRematchOffered.set(false);
        this.showMobileResult.set(true);
        this.boardInitialized = false;
        this.currentPly.set(0);
        this.chess.reset();

        if (!this.gameService.gameState() || this.gameService.gameState()?.id !== gameId) {
          this.gameService.loadGame(gameId);
        }
      }
    });

    this.gameService.onMovePlayed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => this.onMovePlayed(data));
    this.gameService.onGameEnded.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => this.onGameEnded(data));
    this.gameService.onDrawOffered.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => this.onDrawOffered(data));
    this.gameService.onRematchOffered.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => this.handleRematchOffer(data));
    this.gameService.onRematchAccepted.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => this.handleRematchAccepted(data));
    this.gameService.onRematchDeclined.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.handleRematchDeclined());
    this.gameService.onDrawDeclined.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.onDrawDeclined());

    this.initDrawOfferState();
    this.setupBeforeUnload();
    this.initOpponentAwayCountdown();
    this.setupKeyboardNavigation();
  }

  private setupKeyboardNavigation(): void {
    if (isPlatformBrowser(this.platformId)) {
      fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
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
        });
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
    this.clearAbortCountdown();
  }

  onBoardMove(event: { move: Move; fen: string }): void {
    const g = this.game();
    if (!g) return;

    const { move, fen } = event;

    if (this.isMyTurn()) {
      this.audioService.playChessMove(move);
      const moveUci = move.from + move.to;
      const piece = this.chess.get(move.from as any);
      const isPromotion =
        piece &&
        piece.type === 'p' &&
        ((piece.color === 'w' && move.to[1] === '8') ||
          (piece.color === 'b' && move.to[1] === '1'));

      if (isPromotion) {
        this.gameService.sendMove(moveUci + (move.promotion || 'q'));
      } else {
        this.gameService.sendMove(moveUci);
      }

      try {
        const result = this.chess.move({ from: move.from, to: move.to, promotion: 'q' });
        if (result) {
          // Optimistically update local state if needed
        }
      } catch {
        this.chess.load(g.fen);
      }
    }
  }

  private onMovePlayed(data: MovePlayedPayload): void {
    if (!data.fen) {
      if (data.status === 'aborted') {
        this.clearAbortCountdown();
      }
      return;
    }

    this.chess.load(data.fen);
    this.displayFen.set(this.chess.fen());
    this.rebuildSanCache();
    const gameState = this.game();
    if (gameState) {
      this.currentPly.set(gameState.moves.length);
      this.clearAbortCountdown();

      // Trigger native pre-move if present
      if (this.isMyTurn()) {
        setTimeout(() => {
          this.board()?.playPremove();
        });
      }
    }

    if (data.is_checkmate || data.is_draw || data.is_stalemate) {
      this.audioService.playBoardEnd();
    } else {
      // Only play opponent's move sounds here. 
      // User's move sound was already played in onBoardMove.
      const g = this.game();
      const isOpponentMove = g && data.turn === g.my_color;
      if (isOpponentMove) {
        this.audioService.playMoveSound(data.san);
      }
    }

    this.drawOfferState.set('none');
  }

  private onGameEnded(data: GameEndedPayload): void {
    this.showMobileResult.set(true);
    this.drawOfferState.set('none');
    const g = this.game();
    if (g) {
      this.audioService.playBoardEnd();

      if (data.rating_change) {
        const change = g.my_color === 'white' ? data.rating_change.white : data.rating_change.black;
        this.ratingChange.set(change);
        this.myRating.set(this.getMyRating() + change);
      }
    }
  }

  private onDrawOffered(data: DrawOfferedPayload): void {
    const g = this.game();
    if (!g) return;
    const myUserId = g.my_color === 'white' ? g.white_player.id : g.black_player.id;
    this.drawOfferState.set(data.offeredByUserId === myUserId ? 'iOffered' : 'opponentOffered');
  }

  private onDrawDeclined(): void {
    this.drawOfferState.set('none');
  }

  private initDrawOfferState(): void {
    const g = this.game();
    if (!g || !g.draw_offered_by) return;
    const myUserId = g.my_color === 'white' ? g.white_player.id : g.black_player.id;
    this.drawOfferState.set(g.draw_offered_by === myUserId ? 'iOffered' : 'opponentOffered');
  }

  private getLegalDestinations(legalMoves: string[]): Map<string, string[]> {
    const dests = new Map<string, string[]>();
    for (const uci of legalMoves) {
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const list = dests.get(from) || [];
      list.push(to);
      dests.set(from, list);
    }
    return dests;
  }

  private rebuildSanCache(): void {
    const g = this.game();
    if (!g) return;

    const newCache: string[] = [];
    this.chessHistory = [];
    const tempChess = new Chess();
    this.chessHistory.push(new Chess(tempChess.fen()));

    tempChess.reset();
    for (const uci of g.moves) {
      if (!uci || uci.length < 4) {
        newCache.push(uci);
        this.chessHistory.push(new Chess(tempChess.fen()));
        continue;
      }
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      try {
        const result = tempChess.move({ from, to, promotion: promotion as any });
        if (result) {
          newCache.push(result.san);
          this.chessHistory.push(new Chess(tempChess.fen()));
        } else {
          newCache.push(uci);
          this.chessHistory.push(new Chess(tempChess.fen()));
        }
      } catch {
        newCache.push(uci);
        this.chessHistory.push(new Chess(tempChess.fen()));
      }
    }
    this.moveSanCache.set(newCache);
  }

  goToMove(ply: number): void {
    const g = this.game();
    if (!g) return;

    this.currentPly.set(ply);
    const pos = this.chessHistory[ply];
    if (pos) {
      this.chess.load(pos.fen());
      this.displayFen.set(this.chess.fen());
      
      if (ply > 0) {
        const san = this.moveSanCache()[ply - 1];
        this.audioService.playMoveSound(san);
      } else {
        this.audioService.playNavigationSound();
      }
    }
  }

  goToStart(): void {
    this.goToMove(0);
  }
  goToEnd(): void {
    const g = this.game();
    if (g) this.goToMove(g.moves.length);
  }
  previousMove(): void {
    const current = this.currentPly();
    if (current > 0) this.goToMove(current - 1);
  }
  nextMove(): void {
    const g = this.game();
    const current = this.currentPly();
    if (g && current < g.moves.length - 1) this.goToMove(current + 1);
  }

  resign(): void {
    this.showResignConfirm.set(true);
  }
  confirmResign(): void {
    this.showResignConfirm.set(false);
    this.gameService.resign();
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
  cancelDrawOffer(): void {
    this.gameService.cancelDrawOffer();
    this.drawOfferState.set('none');
  }
  acceptDraw(): void {
    this.gameService.acceptDraw();
  }
  declineDraw(): void {
    this.gameService.declineDraw();
    this.drawOfferState.set('none');
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
