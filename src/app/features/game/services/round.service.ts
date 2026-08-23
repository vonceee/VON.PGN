import { Injectable, inject, signal, NgZone, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoundData {
  gameId: string;
  white: string;
  black: string;
  fen: string;
  steps: RoundStep[];
  possibleMoves: Record<string, string[]> | null;
  clock: { white: number; black: number };
  status: string;
  winner: string | null;
}

export interface RoundStep {
  ply: number;
  fen: string;
  san: string | null;
  uci: string | null;
  check: boolean;
}

export interface ApiMove {
  ply: number;
  fen: string;
  san: string;
  uci: string;
  check: boolean;
  /** Server-computed legal destinations for the NEXT player to move. */
  dests: Record<string, string[]>;
  clock: { white: number; black: number };
  status?: string;
  winner?: string | null;
}

export interface ApiEnd {
  winner: string | null;
  status: string;
  clock: { white: number; black: number };
}

// ── TransientMoveService ──────────────────────────────────────────────────────
/**
 * Mirrors Lila's TransientMove class.
 * Registers a 10-second timeout after each move is sent.
 * If the server has not responded with game_move by then,
 * it triggers a full game_join to resync state.
 */
@Injectable()
export class TransientMoveService {
  private timer?: ReturnType<typeof setTimeout>;
  private gameId: string | null = null;
  private reloadFn?: () => void;

  init(gameId: string, reloadFn: () => void): void {
    this.gameId = gameId;
    this.reloadFn = reloadFn;
  }

  register(): void {
    this.clear();
    this.timer = setTimeout(() => this.expire(), 10_000);
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private expire(): void {
    console.warn('[TransientMove] Server ack timeout — reloading game state');
    this.reloadFn?.();
  }
}

// ── RoundService ──────────────────────────────────────────────────────────────
/**
 * Mirrors Lila's RoundController (ctrl.ts).
 * Owns all socket communication and game state signals for a live game.
 */
@Injectable()
export class RoundService {
  private authService = inject(AuthService);
  private ngZone      = inject(NgZone);
  private platformId  = inject(PLATFORM_ID);
  readonly transient  = new TransientMoveService();

  private socket: Socket | null = null;
  private socketUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';

  // ── Game state signals ───────────────────────────────────────────────────
  data         = signal<RoundData | null>(null);
  boardFen     = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  possibleMoves = signal<Record<string, string[]> | null>(null);
  clock        = signal<{ white: number; black: number }>({ white: 300, black: 300 });
  myColor      = signal<'white' | 'black' | null>(null);
  isActive     = signal(false);
  winner       = signal<string | null>(null);
  endStatus    = signal<string | null>(null);
  drawOffer    = signal<'white' | 'black' | null>(null);

  // ── Event streams ────────────────────────────────────────────────────────
  private moveSubject = new Subject<ApiMove>();
  private endSubject  = new Subject<ApiEnd>();
  onMove$ = this.moveSubject.asObservable();
  onEnd$  = this.endSubject.asObservable();

  // ── Connection ───────────────────────────────────────────────────────────

  connect(): void {
    if (!isPlatformBrowser(this.platformId) || this.socket?.connected) return;
    const token = this.authService.getToken();
    this.socket = io(this.socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket.on('connect', () => console.log('[Round] Connected'));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  /**
   * Join a game and subscribe to all game events.
   * Called from GameComponent.ngOnInit().
   */
  joinGame(gameId: string): void {
    if (!this.socket) this.connect();

    const myUid = String(this.authService.currentUser()?.uid);

    // Init transient move safety net
    this.transient.init(gameId, () => {
      this.socket?.emit('game_join', { gameId });
    });

    // ── game_full (initial state + desync recovery) ─────────────────────
    this.socket!.on('game_full', (d: RoundData) => {
      this.ngZone.run(() => {
        this.data.set(d);
        this.boardFen.set(d.fen);
        this.clock.set(d.clock);
        this.myColor.set(String(d.white) === myUid ? 'white' : 'black');
        this.isActive.set(d.status === 'started');
        this.winner.set(d.winner);
        this.possibleMoves.set(d.possibleMoves);
        this.transient.clear();
      });
    });

    // ── game_move (server-confirmed move broadcast) ─────────────────────
    this.socket!.on('game_move', (o: ApiMove) => {
      this.ngZone.run(() => {
        this.boardFen.set(o.fen);
        this.clock.set(o.clock);

        // Only expose dests to the active player; null locks the board
        const isMyTurn = this.myColor() === (o.ply % 2 === 0 ? 'white' : 'black');
        this.possibleMoves.set(isMyTurn && !o.winner ? o.dests : null);

        if (o.winner !== undefined) {
          this.winner.set(o.winner ?? null);
          this.endStatus.set(o.status ?? null);
          this.isActive.set(false);
        }

        // Transient: server acked the move
        this.transient.clear();

        // Push to subscribers (GameComponent uses this to update move list)
        this.moveSubject.next(o);
        this.drawOffer.set(null); // any move cancels a pending draw offer
      });
    });

    // ── game_clock_tick ─────────────────────────────────────────────────
    this.socket!.on('game_clock_tick', (d: { clock: { white: number; black: number } }) => {
      this.ngZone.run(() => this.clock.set(d.clock));
    });

    // ── game_end ────────────────────────────────────────────────────────
    this.socket!.on('game_end', (d: ApiEnd) => {
      this.ngZone.run(() => {
        this.winner.set(d.winner ?? null);
        this.endStatus.set(d.status);
        this.clock.set(d.clock);
        this.isActive.set(false);
        this.possibleMoves.set(null);
        this.endSubject.next(d);
      });
    });

    // ── game_draw_offer ─────────────────────────────────────────────────
    this.socket!.on('game_draw_offer', (d: { by: 'white' | 'black' }) => {
      this.ngZone.run(() => this.drawOffer.set(d.by));
    });

    // ── game_crowd ──────────────────────────────────────────────────────
    this.socket!.on('game_crowd', (_d: { white: boolean; black: boolean }) => {
      // Future: update opponent online presence UI
    });

    // Join the socket room
    this.socket!.emit('game_join', { gameId });
  }

  // ── Sending moves ────────────────────────────────────────────────────────

  /**
   * Send a UCI move to the server.
   * Registers the transient 10-second safety timer immediately.
   */
  sendMove(uci: string): void {
    const gameId = this.data()?.gameId;
    if (!gameId || !this.isActive()) return;
    this.socket?.emit('game_move', { gameId, uci });
    this.transient.register();
  }

  sendResign(): void {
    const gameId = this.data()?.gameId;
    if (!gameId || !this.isActive()) return;
    this.socket?.emit('game_resign', { gameId });
  }

  sendAbort(): void {
    const gameId = this.data()?.gameId;
    if (!gameId || !this.isActive()) return;
    this.socket?.emit('game_abort', { gameId });
  }

  sendDrawOffer(): void {
    const gameId = this.data()?.gameId;
    if (!gameId || !this.isActive()) return;
    this.socket?.emit('game_draw_offer', { gameId });
  }

  sendDrawAccept(): void {
    const gameId = this.data()?.gameId;
    if (!gameId || !this.isActive()) return;
    this.socket?.emit('game_draw_accept', { gameId });
  }
}
