import { Injectable, inject, signal, OnDestroy, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { AudioService } from './audio.service';
import { environment } from '../../../environments/environment';
import { GameState, MovePlayedPayload, GameEndedPayload, GameSeek } from '../models/game.model';
import { Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class GameService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private audioService = inject(AudioService);
  private platformId = inject(PLATFORM_ID);

  private apiUrl = environment.apiUrl;
  private socket: Socket | null = null;
  private socketUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';

  private pendingGameId: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  gameState = signal<GameState | null>(null);
  isSearching = signal(false);
  isConnected = signal(false);
  isLoading = signal(false);
  searchTimeControl = signal('');

  private movePlayed$ = new Subject<MovePlayedPayload>();
  private gameEnded$ = new Subject<GameEndedPayload>();

  get onMovePlayed() { return this.movePlayed$.asObservable(); }
  get onGameEnded() { return this.gameEnded$.asObservable(); }
  
  // Additional observables for live-game component
  private drawOffered$ = new Subject<any>();
  private playerAbsent$ = new Subject<any>();
  private playerReturned$ = new Subject<any>();
  
  get onDrawOffered() { return this.drawOffered$.asObservable(); }
  get onPlayerAbsent() { return this.playerAbsent$.asObservable(); }
  get onPlayerReturned() { return this.playerReturned$.asObservable(); }
  
  opponentAwayCountdown = signal<number | null>(null);

  // Seeks-related (for seek-board component)
  seeks = signal<GameSeek[]>([]);
  isSeeksConnected = signal(false);

  ngOnDestroy(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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
          this.connectSocket();
          this.subscribeToGame(res.game.id);
        } else {
          this.gameState.set(null);
        }
      });
  }

  seekGame(timeControl: string): void {
    this.isSearching.set(true);

    this.http
      .post<{ matched: boolean; game_id?: string; message: string; existing_game?: GameState }>(
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
          this.audioService.playMatchFound();
          this.loadGameAndNavigate(res.game_id);
        } else if (res.existing_game) {
          this.isSearching.set(false);
          this.audioService.playMatchFound();
          this.gameState.set(res.existing_game);
          this.connectSocket();
          this.subscribeToGame(res.existing_game.id);
          this.startHeartbeat();
          this.router.navigate(['/play', res.existing_game.id]);
        } else {
          // Start polling for match
          this.pollForMatch(timeControl);
        }
      });
  }

  cancelSeek(): void {
    this.isSearching.set(false);
    const timeControl = this.searchTimeControl();
    if (!timeControl) return;
    this.http
      .post(`${this.apiUrl}/game/seek/cancel`, { time_control: timeControl })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  loadGame(gameId: string): void {
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(catchError(() => of({ game: null })))
      .subscribe((res) => {
        if (res.game) {
          this.gameState.set(res.game);
          this.connectSocket();
          setTimeout(() => {
            this.subscribeToGame(gameId);
            this.startHeartbeat();
          }, 500);
        }
      });
  }

  sendMove(move: string): void {
    const game = this.gameState();
    if (!game || !this.socket?.connected) return;
    this.socket.emit('make_move', { gameId: game.id, move });
  }

  resign(): void {
    const game = this.gameState();
    if (!game) return;
    this.http
      .post(`${this.apiUrl}/game/${game.id}/resign`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  offerDraw(): void {
    const game = this.gameState();
    if (!game) return;
    this.http
      .post(`${this.apiUrl}/game/${game.id}/draw`, { action: 'offer' })
      .pipe(catchError(() => of(null)))
      .subscribe();
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
            };
          });
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
            };
          });
        }
      });
  }

  private updateGameBuffer(gameId: string, secondsRemaining: number): void {
    const currentGame = this.gameState();
    if (currentGame && currentGame.id === gameId) {
      this.gameState.set({
        ...currentGame,
        bufferCountdown: secondsRemaining
      });
    }
  }

  private updateGameStarted(gameId: string, gameStartedAt: string): void {
    const currentGame = this.gameState();
    if (currentGame && currentGame.id === gameId) {
      this.gameState.set({
        ...currentGame,
        bufferCountdown: null,
        gameStartedAt
      });
    }
  }

  clearGame(): void {
    this.stopHeartbeat();
    this.gameState.set(null);
    if (this.socket) {
      this.socket.off('move_made');
      this.socket.off('game_ended');
      this.socket.off('clock_sync');
    }
    this.router.navigate(['/play']);
  }

  hasSocketConnection(): boolean {
    return !!this.socket && this.socket.connected;
  }

  // ── Seeks API (for seek-board component) ────────────────────────

  joinSeek(seekId: number): void {
    this.http
      .post<{ matched: boolean; game_id?: string; message: string; game?: GameState }>(
        `${this.apiUrl}/seeks/${seekId}/join`,
        {},
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) return;
        if (res.matched && res.game_id) {
          this.audioService.playMatchFound();
          this.loadGameAndNavigate(res.game_id);
        } else if (res.game) {
          this.audioService.playMatchFound();
          this.gameState.set(res.game);
          this.connectSocket();
          this.subscribeToGame(res.game.id);
          this.startHeartbeat();
          this.router.navigate(['/play', res.game.id]);
        }
      });
  }

  subscribeToSeeksChannel(): void {
    this.isSeeksConnected.set(true);
    this.fetchSeeks();
  }

  fetchSeeks(): void {
    this.http
      .get<{ seeks: GameSeek[] }>(`${this.apiUrl}/seeks`)
      .pipe(catchError(() => of({ seeks: [] })))
      .subscribe((res) => {
        this.seeks.set(res.seeks);
      });
  }

  // ── Socket.io ───────────────────────────────────────────────────

  connectSocket(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.socket?.connected) return;

    // Don't connect if auth service is not initialized yet
    if (!this.authService.isInitialized()) {
      console.log('[Game] Not connecting socket - auth service not initialized');
      return;
    }

    const token = this.authService.getToken();
    const user = this.authService.currentUser();

    console.log('[Game] Connecting socket with auth:', {
      hasToken: !!token,
      userId: user?.id,
      userName: user?.name,
      isAuthenticated: this.authService.isAuthenticated()
    });

    // Don't connect if user is not authenticated
    if (!user?.id) {
      console.log('[Game] Not connecting socket - user not authenticated');
      return;
    }

    this.socket = io(this.socketUrl, {
      auth: { token, userId: user.id, userName: user.name },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Game] Socket connected');
      this.isConnected.set(true);
      this.flushPendingSubscription();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Game] Socket disconnected:', reason);
      this.isConnected.set(false);
    });

    this.socket.on('connect_error', (err) => {
      console.log('[Game] Socket connection error:', err);
    });

    // Listen for server-side buffer countdown
    this.socket.on('buffer_countdown', (data: { gameId: string; secondsRemaining: number }) => {
      console.log('[Game] Buffer countdown:', data.secondsRemaining);
      this.updateGameBuffer(data.gameId, data.secondsRemaining);
    });

    // Listen for game started event
    this.socket.on('game_started', (data: { gameId: string; gameStartedAt: string }) => {
      console.log('[Game] Game started at:', data.gameStartedAt);
      this.updateGameStarted(data.gameId, data.gameStartedAt);
    });
  }

  subscribeToGame(gameId: string): void {
    this.pendingGameId = gameId;
    if (!this.socket) {
      this.connectSocket();
    }
    if (!this.hasSocketConnection()) return;
    this.setupGameChannel(gameId);
  }

  private flushPendingSubscription(): void {
    const gameId = this.pendingGameId;
    if (!gameId || !this.socket || !this.isConnected()) return;
    this.pendingGameId = null;
    this.setupGameChannel(gameId);
  }

  private setupGameChannel(gameId: string): void {
    if (!this.socket) return;

    console.log(`[Game] Joining game room ${gameId}`);
    this.socket.emit('join_game', gameId);

    this.socket.on('move_made', (data: any) => {
      if (data.gameId !== gameId) return;

      this.gameState.update((state) => {
        if (!state) return state;
        return {
          ...state,
          fen: data.fen,
          turn: data.turn,
          moves: [...state.moves, data.move],
          white_time_remaining_ms: data.whiteTimeRemainingMs,
          black_time_remaining_ms: data.blackTimeRemainingMs,
          status: data.status,
          result: data.result,
          termination: data.termination,
          legal_moves: data.legalMoves,
          draw_offered_by: null,
          draw_offered_at: null,
          // Preserve my_color
          my_color: state.my_color,
        };
      });

      this.movePlayed$.next({
        game_id: data.gameId,
        move: data.move,
        san: data.san,
        fen: data.fen,
        turn: data.turn,
        white_time_remaining_ms: data.whiteTimeRemainingMs,
        black_time_remaining_ms: data.blackTimeRemainingMs,
        server_timestamp: data.serverTimestamp,
        status: data.status,
        result: data.result,
        termination: data.termination,
        is_check: data.isCheck,
        is_checkmate: data.isCheckmate,
        is_stalemate: data.isStalemate,
        is_draw: data.isDraw,
        legal_moves: data.legalMoves,
      });
    });

    this.socket.on('game_ended', (data: any) => {
      if (data.gameId !== gameId) return;

      const currentState = this.gameState();
      this.gameState.update((state) => {
        if (!state) return state;
        return {
          ...state,
          status: 'completed',
          result: data.result,
          termination: data.termination,
          legal_moves: [],
          draw_offered_by: null,
          draw_offered_at: null,
        };
      });

      this.stopHeartbeat();
      this.gameEnded$.next({
        game_id: gameId,
        result: data.result,
        termination: data.termination,
        status: 'completed',
        white_time_remaining_ms: currentState?.white_time_remaining_ms ?? 0,
        black_time_remaining_ms: currentState?.black_time_remaining_ms ?? 0,
        fen: currentState?.fen ?? '',
      });

      if (data.result === '1/2-1/2') {
        this.audioService.playDraw();
      } else {
        this.audioService.playVictory();
      }
    });

    this.socket.on('clock_sync', (data: any) => {
      this.gameState.update((state) => {
        if (!state) return state;
        return {
          ...state,
          white_time_remaining_ms: data.whiteTimeRemainingMs,
          black_time_remaining_ms: data.blackTimeRemainingMs,
          server_timestamp: data.serverTimestamp,
        };
      });
    });

    // Load initial state
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(catchError(() => of({ game: null })))
      .subscribe((res) => {
        if (res.game) {
          this.gameState.set(res.game);
        }
      });
  }

  loadGameAndNavigate(gameId: string): void {
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(catchError(() => of({ game: null })))
      .subscribe((res) => {
        if (res.game) {
          this.gameState.set(res.game);
          this.connectSocket();
          this.subscribeToGame(gameId);
          this.startHeartbeat();
          this.router.navigate(['/play', gameId]);
        }
      });
  }

  // ── Heartbeat ───────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      const game = this.gameState();
      if (!game || !this.socket?.connected || game.status !== 'active') return;
      this.socket.emit('heartbeat', { gameId: game.id });
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ── Match Polling ───────────────────────────────────────────────

  private pollForMatch(timeControl: string): void {
    let pollCount = 0;
    const maxPolls = 40; // 40 * 3s = 2 minutes
    
    const poll = setInterval(() => {
      pollCount++;
      
      if (pollCount >= maxPolls || !this.isSearching()) {
        clearInterval(poll);
        this.isSearching.set(false);
        return;
      }

      this.http
        .get<{ game: GameState | null }>(`${this.apiUrl}/game/active`)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (res?.game) {
            clearInterval(poll);
            this.isSearching.set(false);
            this.audioService.playMatchFound();
            this.gameState.set(res.game);
            this.connectSocket();
            this.subscribeToGame(res.game.id);
            this.startHeartbeat();
            this.router.navigate(['/play', res.game.id]);
          }
        });
    }, 3000);
  }
}
