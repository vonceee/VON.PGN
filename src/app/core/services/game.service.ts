import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  GameState,
  MovePlayedPayload,
  GameEndedPayload,
  ClockSyncPayload,
  DrawOfferedPayload,
} from '../models/game.model';
import { Subject, of, Subscription, timer, interval } from 'rxjs';
import { catchError, switchMap, takeWhile } from 'rxjs/operators';

declare global {
  interface Window {
    Echo?: any;
    Pusher?: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class GameService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  private apiUrl = environment.apiUrl;
  private echo: any = null;
  private gameChannel: any = null;
  private echoLoadAttempted = false;
  private pendingGameId: string | null = null;

  // Polling
  private statePollSub: Subscription | null = null;
  private seekPollSub: Subscription | null = null;

  gameState = signal<GameState | null>(null);
  isSearching = signal(false);
  searchTimeControl = signal('');
  isConnected = signal(false);
  isLoading = signal(false);

  private movePlayed$ = new Subject<MovePlayedPayload>();
  private gameEnded$ = new Subject<GameEndedPayload>();
  private drawOffered$ = new Subject<DrawOfferedPayload>();

  get onMovePlayed() { return this.movePlayed$.asObservable(); }
  get onGameEnded() { return this.gameEnded$.asObservable(); }
  get onDrawOffered() { return this.drawOffered$.asObservable(); }

  ngOnDestroy(): void {
    this.stopPolling();
    this.stopSeekPolling();
    this.leaveGameChannel();
  }

  // ── Public API ──────────────────────────────────────────────────

  checkActiveGame(): void {
    this.isLoading.set(true);
    this.http
      .get<{ game: GameState | null }>(`${this.apiUrl}/game/active`)
      .pipe(catchError(() => of({ game: null })))
      .subscribe((res) => {
        this.isLoading.set(false);
        if (res.game) {
          this.gameState.set(res.game);
          this.ensureEchoConnected();
          this.subscribeToGame(res.game.id);
        } else {
          this.gameState.set(null);
        }
      });
  }

  seekGame(timeControl: string): void {
    this.isSearching.set(true);
    this.searchTimeControl.set(timeControl);

    this.http
      .post<{ matched: boolean; game_id?: string; message: string }>(
        `${this.apiUrl}/game/seek`,
        { time_control: timeControl },
      )
      .pipe(catchError(() => {
        this.isSearching.set(false);
        return of(null);
      }))
      .subscribe((res) => {
        if (!res) return;
        if (res.matched && res.game_id) {
          this.isSearching.set(false);
          this.searchTimeControl.set('');
          this.loadGameAndNavigate(res.game_id);
        } else {
          this.startSeekPolling();
        }
      });
  }

  cancelSeek(): void {
    this.stopSeekPolling();
    const timeControl = this.searchTimeControl();
    if (!timeControl) return;
    this.http
      .post(`${this.apiUrl}/game/seek/cancel`, { time_control: timeControl })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.isSearching.set(false);
        this.searchTimeControl.set('');
      });
  }

  loadGame(gameId: string): void {
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(catchError((err) => {
        console.error('[Game] loadGame error:', err);
        return of({ game: null });
      }))
      .subscribe((res) => {
        if (res.game) {
          this.gameState.set(res.game);
          this.ensureEchoConnected();
          this.subscribeToGame(gameId);
        } else {
          console.error('[Game] loadGame: no game data in response');
        }
      });
  }

  sendMove(move: string): void {
    const game = this.gameState();
    if (!game) {
      console.error('[Game] sendMove - no game state');
      return;
    }
    console.log('[Game] sendMove called', { gameId: game.id, move });
    
    this.http
      .post<any>(`${this.apiUrl}/game/${game.id}/move`, { move })
      .pipe(
        catchError((err) => {
          console.error('[Game] sendMove HTTP error:', err);
          return of(null);
        })
      )
      .subscribe({
        next: (res) => {
          if (!res) {
            console.error('[Game] sendMove failed - no response');
            return;
          }
          if (res.message && !res.move) {
            console.error('[Game] sendMove failed:', res.message);
            return;
          }
          console.log('[Game] sendMove success', res);
          
          // Update local state immediately with server response
          // This ensures the move shows even if WebSocket event is missed
          this.gameState.update((state) => {
            if (!state) return state;
            return {
              ...state,
              fen: res.fen,
              turn: res.turn,
              moves: [...state.moves, res.move],
              status: res.status,
              result: res.result,
              termination: res.termination,
              legal_moves: res.legal_moves ?? [],
              white_time_remaining_ms: res.clock?.white_time_remaining_ms ?? state.white_time_remaining_ms,
              black_time_remaining_ms: res.clock?.black_time_remaining_ms ?? state.black_time_remaining_ms,
              server_timestamp: res.clock?.server_timestamp ?? state.server_timestamp,
            };
          });
          
          // Emit move played event
          this.movePlayed$.next({
            game_id: game.id,
            move: res.move,
            san: res.san,
            fen: res.fen,
            turn: res.turn,
            white_time_remaining_ms: res.clock?.white_time_remaining_ms ?? 0,
            black_time_remaining_ms: res.clock?.black_time_remaining_ms ?? 0,
            server_timestamp: res.clock?.server_timestamp ?? '',
            status: res.status,
            result: res.result,
            termination: res.termination,
            is_check: res.clock?.is_check ?? false,
            is_checkmate: res.clock?.is_checkmate ?? false,
            is_stalemate: res.clock?.is_stalemate ?? false,
            is_draw: res.clock?.is_draw ?? false,
            legal_moves: res.legal_moves ?? [],
          });
        },
        error: (err) => {
          console.error('[Game] sendMove subscription error:', err);
        }
      });
  }

  resign(): void {
    const game = this.gameState();
    if (!game) return;
    this.http
      .post(`${this.apiUrl}/game/${game.id}/resign`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  abortGame(): void {
    const game = this.gameState();
    if (!game) return;
    this.http
      .post(`${this.apiUrl}/game/${game.id}/abort`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  offerDraw(): void {
    const game = this.gameState();
    if (!game) return;
    this.http
      .post(`${this.apiUrl}/game/${game.id}/draw`, { action: 'offer' })
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res?.cooldown_remaining_seconds) {
          // Server rejected due to cooldown — update local state
          this.gameState.update((state) => {
            if (!state) return state;
            return { ...state };
          });
        }
      });
  }

  acceptDraw(): void {
    const game = this.gameState();
    if (!game) return;
    this.http
      .post(`${this.apiUrl}/game/${game.id}/draw`, { action: 'accept' })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  declineDraw(): void {
    const game = this.gameState();
    if (!game) return;
    this.http
      .post(`${this.apiUrl}/game/${game.id}/draw`, { action: 'decline' })
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        // Clear local draw offer state
        this.gameState.update((state) => {
          if (!state) return state;
          return {
            ...state,
            draw_offered_by: null,
            draw_offered_at: null,
          };
        });
      });
  }

  clearGame(): void {
    this.stopPolling();
    this.stopSeekPolling();
    this.gameState.set(null);
    this.leaveGameChannel();
    this.router.navigate(['/play']);
  }

  syncClock(gameId: string): void {
    this.http
      .post<any>(`${this.apiUrl}/game/${gameId}/sync-clock`, {})
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) return;

        const currentGame = this.gameState();
        if (!currentGame || currentGame.id !== gameId) return;

        if (res.game_status === 'completed') {
          this.gameState.update((state) => {
            if (!state) return state;
            return {
              ...state,
              status: 'completed',
              result: res.result,
              termination: res.termination,
              white_time_remaining_ms: res.white_time_remaining_ms ?? 0,
              black_time_remaining_ms: res.black_time_remaining_ms ?? 0,
              fen: res.fen,
              buffer_seconds_remaining: 0,
            };
          });
          this.stopPolling();
          this.gameEnded$.next({
            game_id: gameId,
            result: res.result,
            termination: res.termination,
            status: 'completed',
            white_time_remaining_ms: res.white_time_remaining_ms ?? 0,
            black_time_remaining_ms: res.black_time_remaining_ms ?? 0,
            fen: res.fen,
          });
        } else {
          this.gameState.update((state) => {
            if (!state) return state;
            return {
              ...state,
              white_time_remaining_ms: res.white_time_remaining_ms ?? state.white_time_remaining_ms,
              black_time_remaining_ms: res.black_time_remaining_ms ?? state.black_time_remaining_ms,
              server_timestamp: res.server_timestamp ?? state.server_timestamp,
              buffer_seconds_remaining: res.buffer_seconds_remaining ?? 0,
            };
          });
        }
      });
  }

  // ── Echo / WebSocket ────────────────────────────────────────────

  ensureEchoConnected(): void {
    if (this.echo) return;
    if (this.echoLoadAttempted) return;
    this.echoLoadAttempted = true;

    if (!window.Pusher) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pusher-js@8.4.0-rc2/dist/web/pusher.min.js';
      s.onload = () => this.loadEcho();
      s.onerror = () => console.warn('[Game] Failed to load Pusher.js');
      document.head.appendChild(s);
    } else {
      this.loadEcho();
    }
  }

  private loadEcho(): void {
    if (window.Echo) { this.initEcho(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/laravel-echo@2.0.2/dist/echo.iife.js';
    s.onload = () => setTimeout(() => this.initEcho(), 50);
    document.head.appendChild(s);
  }

  private initEcho(): void {
    try {
      const token = this.authService.getToken();
      if (!token) return;

      const EchoConstructor = window.Echo;
      if (!EchoConstructor || typeof EchoConstructor !== 'function') return;

      const useTLS = environment.reverbScheme === 'wss';

      this.echo = new EchoConstructor({
        broadcaster: 'reverb',
        key: environment.reverbKey,
        wsHost: environment.reverbHost,
        wsPort: environment.reverbPort,
        wssPort: environment.reverbPort,
        forceTLS: useTLS,
        enabledTransports: useTLS ? ['wss'] : ['ws'],
        authEndpoint: `${this.apiUrl.replace('/api', '')}/broadcasting/auth`,
        auth: {
          headers: { Authorization: `Bearer ${token}` },
        },
        activityTimeout: 120000,
        pongTimeout: 30000,
        disableStats: true,
      });

      const pusher = this.echo?.connector?.pusher;
      if (pusher) {
        pusher.connection.bind('connected', () => {
          this.isConnected.set(true);
          this.flushPendingSubscription();
        });

        pusher.connection.bind('disconnected', () => {
          this.isConnected.set(false);
        });

        pusher.connection.bind('error', (err: any) => {
          console.error('[Game] Pusher connection error:', err);
        });
      }
    } catch (err) {
      console.error('[Game] Failed to init Echo:', err);
    }
  }

  /**
   * Subscribe to a game channel. If Echo isn't connected yet,
   * stores the gameId and subscribes when the connection succeeds.
   */
  subscribeToGame(gameId: string): void {
    // Always store intent — even if connection isn't ready
    this.pendingGameId = gameId;

    if (!this.echo || !this.isConnected()) {
      return; // Will be flushed by flushPendingSubscription on connect
    }

    this.flushPendingSubscription();
  }

  private flushPendingSubscription(): void {
    const gameId = this.pendingGameId;
    if (!gameId || !this.echo || !this.isConnected()) return;
    this.pendingGameId = null;

    this.setupGameChannel(gameId);
  }

  private setupGameChannel(gameId: string): void {
    this.leaveGameChannel();

    try {
      this.gameChannel = this.echo.join(`game.${gameId}`);

      this.gameChannel.on('pusher:subscription_succeeded', () => {
        // Re-fetch state to get authoritative legal moves after subscribing
        this.loadGameStateSilent(gameId);
        // Start polling fallback
        this.startStatePolling(gameId);
      });

      this.gameChannel.on('pusher:subscription_error', (status: any) => {
        console.error('[Game] Subscription error:', status);
        // Fallback: start polling if WebSocket auth fails
        this.startStatePolling(gameId);
      });

      this.gameChannel.listen('.App\\Events\\MovePlayed', (data: MovePlayedPayload) => {
        console.log('[Game] Received MovePlayed event', {
          gameId: data.game_id,
          move: data.move,
          fen: data.fen,
          turn: data.turn,
        });
        this.gameState.update((state) => {
          if (!state) return state;
          return {
            ...state,
            fen: data.fen,
            turn: data.turn,
            moves: [...state.moves, data.move],
            white_time_remaining_ms: data.white_time_remaining_ms,
            black_time_remaining_ms: data.black_time_remaining_ms,
            server_timestamp: data.server_timestamp,
            status: data.status as any,
            result: data.result,
            termination: data.termination,
            legal_moves: data.legal_moves,
            draw_offered_by: null,
            draw_offered_at: null,
            buffer_seconds_remaining: data.buffer_seconds_remaining ?? 0,
          };
        });
        this.movePlayed$.next(data);
      });

      this.gameChannel.listen('.App\\Events\\GameEnded', (data: GameEndedPayload) => {
        this.gameState.update((state) => {
          if (!state) return state;
          return {
            ...state,
            status: (data.status as any) || 'completed',
            result: data.result,
            termination: data.termination,
            white_time_remaining_ms: data.white_time_remaining_ms,
            black_time_remaining_ms: data.black_time_remaining_ms,
            fen: data.fen ?? state.fen,
            legal_moves: [],
            draw_offered_by: null,
            draw_offered_at: null,
            buffer_seconds_remaining: 0,
          };
        });
        this.stopPolling();
        this.gameEnded$.next(data);
      });

      this.gameChannel.listen('.App\\Events\\ClockSync', (data: ClockSyncPayload) => {
        this.gameState.update((state) => {
          if (!state) return state;
          return {
            ...state,
            white_time_remaining_ms: data.white_time_remaining_ms,
            black_time_remaining_ms: data.black_time_remaining_ms,
            server_timestamp: data.server_timestamp,
            buffer_seconds_remaining: data.buffer_seconds_remaining ?? 0,
          };
        });
      });

      this.gameChannel.listen('.App\\Events\\DrawOffered', (data: DrawOfferedPayload) => {
        this.gameState.update((state) => {
          if (!state) return state;
          return {
            ...state,
            draw_offered_by: data.offered_by_user_id,
            draw_offered_at: new Date().toISOString(),
          };
        });
        this.drawOffered$.next(data);
      });
    } catch (err) {
      console.error('[Game] Failed to setup game channel:', err);
      // Fallback: start polling
      this.startStatePolling(gameId);
    }
  }

  private leaveGameChannel(): void {
    if (this.gameChannel && this.echo) {
      const gameId = this.gameState()?.id;
      if (gameId) {
        try { this.echo.leave(`game.${gameId}`); } catch { /* */ }
      }
      this.gameChannel = null;
    }
  }

  // ── State Polling (WebSocket fallback) ──────────────────────────

  private startStatePolling(gameId: string): void {
    this.stopPolling();

    this.statePollSub = interval(4000)
      .pipe(
        takeWhile(() => {
          const g = this.gameState();
          return !!g && g.id === gameId && g.status === 'active';
        }),
        switchMap(() =>
          this.http
            .get<{ game: GameState | null }>(`${this.apiUrl}/game/${gameId}`)
            .pipe(catchError(() => of(null))),
        ),
      )
      .subscribe((res: any) => {
        if (!res?.game) return;
        const local = this.gameState();
        if (!local) return;

        // Only update if server state diverges (missed WebSocket event)
        if (local.fen !== res.game.fen || local.moves.length !== res.game.moves.length) {
          console.log('[Game] Polling detected state divergence, updating', {
            localFen: local.fen,
            serverFen: res.game.fen,
            localMoves: local.moves.length,
            serverMoves: res.game.moves.length,
          });
          this.gameState.set(res.game);
          this.movePlayed$.next({
            game_id: res.game.id,
            move: res.game.moves[res.game.moves.length - 1] ?? '',
            san: '',
            fen: res.game.fen,
            turn: res.game.turn,
            white_time_remaining_ms: res.game.white_time_remaining_ms,
            black_time_remaining_ms: res.game.black_time_remaining_ms,
            server_timestamp: res.game.server_timestamp,
            status: res.game.status,
            result: res.game.result,
            termination: res.game.termination,
            is_check: false,
            is_checkmate: false,
            is_stalemate: false,
            is_draw: false,
            legal_moves: res.game.legal_moves,
            buffer_seconds_remaining: res.game.buffer_seconds_remaining ?? 0,
          });
        }

        if (res.game.status !== 'active') {
          this.stopPolling();
          this.gameState.set(res.game);
        }
      });
  }

  private stopPolling(): void {
    if (this.statePollSub) {
      this.statePollSub.unsubscribe();
      this.statePollSub = null;
    }
  }

  /**
   * Fetch game state without re-subscribing (used after channel join).
   */
  private loadGameStateSilent(gameId: string): void {
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(catchError(() => of({ game: null })))
      .subscribe((res) => {
        if (res.game) {
          this.gameState.set(res.game);
        }
      });
  }

  private loadGameAndNavigate(gameId: string): void {
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(catchError((err) => {
        console.error('[Game] loadGameAndNavigate error:', err);
        return of({ game: null });
      }))
      .subscribe((res) => {
        if (res.game) {
          this.gameState.set(res.game);
          this.ensureEchoConnected();
          this.subscribeToGame(gameId);
          this.router.navigate(['/play', gameId]);
        } else {
          console.error('[Game] loadGameAndNavigate: no game data');
        }
      });
  }

  // ── Seek Polling ────────────────────────────────────────────────

  private startSeekPolling(): void {
    this.stopSeekPolling();
    let errors = 0;

    this.seekPollSub = timer(3000, 3000)
      .pipe(
        switchMap(() => {
          if (!this.isSearching()) return of(null);
          return this.http
            .get<{ game: GameState | null }>(`${this.apiUrl}/game/active`)
            .pipe(
              catchError(() => {
                errors++;
                if (errors >= 3) {
                  this.isSearching.set(false);
                  this.searchTimeControl.set('');
                  this.stopSeekPolling();
                }
                return of(null);
              }),
            );
        }),
      )
      .subscribe((res: any) => {
        if (!res?.game) return;
        errors = 0;
        this.isSearching.set(false);
        this.searchTimeControl.set('');
        this.stopSeekPolling();
        this.gameState.set(res.game);
        this.ensureEchoConnected();
        this.subscribeToGame(res.game.id);
        this.router.navigate(['/play', res.game.id]);
      });
  }

  private stopSeekPolling(): void {
    if (this.seekPollSub) {
      this.seekPollSub.unsubscribe();
      this.seekPollSub = null;
    }
  }
}
