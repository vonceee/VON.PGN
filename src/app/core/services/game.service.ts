import { Injectable, inject, signal, OnDestroy, PLATFORM_ID, untracked, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { AudioService } from './audio.service';
import { environment } from '../../../environments/environment';
import { GameState, MovePlayedPayload, GameEndedPayload, GameSeek, RematchOfferedPayload, RematchAcceptedPayload, DrawOfferedPayload, DrawDeclinedPayload } from '../models/game.model';
import { Subject, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { DevLogger } from '../utils/dev-logger';

@Injectable({
  providedIn: 'root',
})
export class GameService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private audioService = inject(AudioService);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    // Manage socket connection lifecycle reactively based on auth state
    effect(() => {
      if (this.authService.isInitialized()) {
        if (this.authService.isAuthenticated()) {
          this.connectSocket();
        } else {
          this.disconnectSocket();
        }
      }
    });
  }

  private apiUrl = environment.apiUrl;
  public socket = signal<Socket | null>(null);
  private socketUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';

  private pendingGameId: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private botMatchTimeout: ReturnType<typeof setTimeout> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  gameState = signal<GameState | null>(null);
  myActiveGame = signal<GameState | null>(null);
  isSearching = signal(false);
  isConnected = signal(false);
  isLoading = signal(false);
  searchTimeControl = signal('');
  isServiceMaintenance = signal(false);

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
  
  private rematchOffered$ = new Subject<RematchOfferedPayload>();
  private rematchAccepted$ = new Subject<RematchAcceptedPayload>();
  private rematchDeclined$ = new Subject<any>();

  get onRematchOffered() { return this.rematchOffered$.asObservable(); }
  get onRematchAccepted() { return this.rematchAccepted$.asObservable(); }
  get onRematchDeclined() { return this.rematchDeclined$.asObservable(); }

  private drawDeclined$ = new Subject<DrawDeclinedPayload>();
  get onDrawDeclined() { return this.drawDeclined$.asObservable(); }
  
  opponentAwayCountdown = signal<number | null>(null);

  // Seeks-related (for seek-board component)
  seeks = signal<GameSeek[]>([]);
  isSeeksConnected = signal(false);

  ngOnDestroy(): void {
    this.stopHeartbeat();
    this.stopPolling();
    if (this.botMatchTimeout) {
      clearTimeout(this.botMatchTimeout);
    }
    this.disconnectSocket();
  }

  disconnectSocket(): void {
    untracked(() => {
      const s = this.socket();
      if (s) {
        s.disconnect();
        this.socket.set(null);
      }
      this.isConnected.set(false);
    });
  }

  // ── Public API ──────────────────────────────────────────────────

  checkActiveGame(): void {
    this.isLoading.set(true);
    this.http
      .get<{ game: GameState | null }>(`${this.apiUrl}/game/active`)
      .pipe(
        catchError((error) => {
          if (error.status === 503) {
            this.isServiceMaintenance.set(true);
          }
          return of({ game: null });
        })
      )
      .subscribe((res) => {
        this.isLoading.set(false);
        if (res.game) {
          this.isServiceMaintenance.set(false);
          const gameWithDefaults = this.applyGameDefaults(res.game);
          this.myActiveGame.set(gameWithDefaults);
          this.gameState.set(gameWithDefaults);
          this.connectSocket();
          this.subscribeToGame(res.game.id);
        } else {
          this.myActiveGame.set(null);
          this.gameState.set(null);
        }
      });
  }

  seekGame(timeControl: string, allowBot: boolean = false): void {
    this.isSearching.set(true);
    this.searchTimeControl.set(timeControl);
    this.connectSocket();

    // Clear any existing bot timeout if we are starting a fresh search
    if (!allowBot && this.botMatchTimeout) {
      clearTimeout(this.botMatchTimeout);
      this.botMatchTimeout = null;
    }

    this.http
      .post<{ matched: boolean; game_id?: string; message: string; existing_game?: GameState; game?: GameState }>(
        `${this.apiUrl}/game/seek`,
        { time_control: timeControl, allow_bot: allowBot },
      )
      .pipe(
        catchError((error) => {
          this.isSearching.set(false);
          if (error.status === 503) {
            this.isServiceMaintenance.set(true);
          }
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        
        if (res.matched && res.game_id) {
          this.isSearching.set(false);
          this.stopPolling();
          if (this.botMatchTimeout) {
            clearTimeout(this.botMatchTimeout);
            this.botMatchTimeout = null;
          }
          this.audioService.playMatchFound();
          
          if (res.game) {
            // Instant load
            const gameWithDefaults = this.applyGameDefaults(res.game);
            this.myActiveGame.set(gameWithDefaults);
            this.gameState.set(gameWithDefaults);
            this.connectSocket();
            this.subscribeToGame(res.game_id);
            this.startHeartbeat();
            this.router.navigate(['/play', res.game_id]);
          } else {
            this.loadGameAndNavigate(res.game_id);
          }
        } else if (res.existing_game) {
          this.isSearching.set(false);
          this.stopPolling();
          if (this.botMatchTimeout) {
            clearTimeout(this.botMatchTimeout);
            this.botMatchTimeout = null;
          }
          this.audioService.playMatchFound();
          this.myActiveGame.set(res.existing_game);
          this.gameState.set(res.existing_game);
          this.connectSocket();
          this.subscribeToGame(res.existing_game.id);
          this.startHeartbeat();
          this.router.navigate(['/play', res.existing_game.id]);
        } else {
          // If we haven't matched and we aren't allowing bots yet, 
          // set a threshold before trying again with bot matching enabled.
          if (!allowBot) {
            if (this.botMatchTimeout) clearTimeout(this.botMatchTimeout);
            this.botMatchTimeout = setTimeout(() => {
              // Only trigger if we are still searching for the same time control
              if (this.isSearching() && this.searchTimeControl() === timeControl) {
                DevLogger.log(`[Matchmaking] 8s threshold reached, enabling bot matching for ${timeControl}`);
                this.seekGame(timeControl, true);
              }
            }, 8000);
          }

          // Start polling for match
          this.pollForMatch(timeControl);
          // Refresh lobby list immediately so my seek appears
          this.fetchSeeks();
        }
      });
  }

  cancelSeek(): void {
    this.isSearching.set(false);
    this.stopPolling();
    if (this.botMatchTimeout) {
      clearTimeout(this.botMatchTimeout);
      this.botMatchTimeout = null;
    }

    const timeControl = this.searchTimeControl();
    if (!timeControl) return;
    this.http
      .post(`${this.apiUrl}/game/seek/cancel`, { time_control: timeControl })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        // Refresh lobby list immediately so my seek disappears
        this.fetchSeeks();
      });
  }

  loadGame(gameId: string): void {
    this.isLoading.set(true);
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(
        catchError((error) => {
          // Fallback to microservice for live/arena games on ANY error except auth
          if (error.status !== 401 && error.status !== 403) {
            return this.http.get<any>(`${this.socketUrl}/api/games/${gameId}`).pipe(
              map(raw => ({ game: this.mapMicroserviceGameToGameState(raw) })),
              catchError(() => of({ game: null }))
            );
          }
          return of({ game: null });
        })
      )
      .subscribe((res) => {
        this.isLoading.set(false);
        if (res.game) {
          this.gameState.set(res.game);
          this.connectSocket();
          this.subscribeToGame(gameId);
          this.startHeartbeat();
        }
      });
  }

  getGameHistory(page: number = 1, type: string = 'all'): Observable<any> {
    let url = `${this.apiUrl}/games/history?page=${page}`;
    if (type !== 'all') {
      url += `&type=${type}`;
    }
    return this.http.get<any>(url);
  }

  getArchivedGame(gameId: string): Observable<{ game: GameState }> {
    return this.http.get<{ game: GameState }>(`${this.apiUrl}/games/archived/${gameId}`);
  }

  sendMove(move: string): void {
    const game = this.gameState();
    const s = this.socket();
    if (!game || !s?.connected) return;
    s.emit('make_move', { gameId: game.id, move });
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
    if (this.socket() && game) {
      this.socket()?.emit('offer_draw', game.id);
    }
  }

  cancelDrawOffer(): void {
    const game = this.gameState();
    if (this.socket() && game) {
      this.socket()?.emit('cancel_draw_offer', game.id);
      // Optimistically update local state
      this.gameState.update(g => g ? ({ ...g, draw_offered_by: null }) : null);
    }
  }

  acceptDraw(): void {
    const game = this.gameState();
    if (this.socket() && game) {
      this.socket()?.emit('respond_draw', { gameId: game.id, accept: true });
    }
  }

  declineDraw(): void {
    const game = this.gameState();
    if (this.socket() && game) {
      this.socket()?.emit('respond_draw', { gameId: game.id, accept: false });
    }
  }

  abortGame(): void {
    const game = this.gameState();
    if (this.socket() && game) {
      this.socket()?.emit('abort_game', game.id);
    }
  }

  offerRematch(): void {
    const game = this.gameState();
    if (this.socket() && game) {
      this.socket()?.emit('offer_rematch', game.id);
    }
  }

  acceptRematch(): void {
    const game = this.gameState();
    if (this.socket() && game) {
      this.socket()?.emit('accept_rematch', game.id);
    }
  }

  declineRematch(): void {
    const game = this.gameState();
    if (this.socket() && game) {
      this.socket()?.emit('decline_rematch', game.id);
    }
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


  clearGame(navigateToPlay: boolean = true): void {
    this.stopHeartbeat();
    this.gameState.set(null);
    this.myActiveGame.set(null);
    if (this.socket()) {
      const s = this.socket();
      s?.off('move_made');
      s?.off('game_ended');
      s?.off('clock_sync');
    }
    if (navigateToPlay) {
      this.router.navigate(['/play']);
    }
  }

  hasSocketConnection(): boolean {
    return !!this.socket() && this.socket()!.connected;
  }

  // ── Seeks API (for seek-board component) ────────────────────────

  joinSeek(seekId: number): void {
    this.connectSocket();
    this.http
      .post<{ matched: boolean; game_id?: string; message: string; game?: GameState }>(
        `${this.apiUrl}/seeks/${seekId}/join`,
        {},
      )
      .pipe(
        catchError((error) => {
          if (error.status === 503) {
            this.isServiceMaintenance.set(true);
          }
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        if (res.matched && res.game_id) {
          this.audioService.playMatchFound();
          if (res.game) {
            const gameWithDefaults = this.applyGameDefaults(res.game);
            this.myActiveGame.set(gameWithDefaults);
            this.gameState.set(gameWithDefaults);
            this.connectSocket();
            this.subscribeToGame(res.game_id);
            this.startHeartbeat();
            this.router.navigate(['/play', res.game_id]);
          } else {
            this.loadGameAndNavigate(res.game_id);
          }
        } else if (res.game) {
          this.audioService.playMatchFound();
          this.myActiveGame.set(res.game);
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

    untracked(() => {
      if (this.socket()?.connected) return;

      // Don't connect if auth service is not initialized yet
      if (!this.authService.isInitialized()) {
        DevLogger.log('[Game] Not connecting socket - auth service not initialized');
        return;
      }

      const token = this.authService.getToken();
      const user = this.authService.currentUser();

      DevLogger.log('[Game] Connecting socket with auth:', {
        hasToken: !!token,
        userId: user?.uid,
        userName: user?.username,
        isAuthenticated: this.authService.isAuthenticated()
      });

      // Don't connect if user data is not available
      if (!user?.uid) {
        DevLogger.log('[Game] Not connecting socket - user data not available');
        return;
      }

      const s = io(this.socketUrl, {
        auth: { token, userId: user.uid, userName: user.username },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      this.socket.set(s);

      s.on('connect', () => {
        DevLogger.log('[Game] Socket connected');
        this.isConnected.set(true);
        this.flushPendingSubscription();
      });

      s.on('disconnect', (reason) => {
        DevLogger.log('[Game] Socket disconnected:', reason);
        this.isConnected.set(false);
      });

      s.on('connect_error', (err) => {
        DevLogger.log('[Game] Socket connection error:', err);
      });
    });
  }

  subscribeToGame(gameId: string): void {
    this.pendingGameId = gameId;
    if (!this.socket()) {
      this.connectSocket();
    }
    if (!this.hasSocketConnection()) return;
    this.setupGameChannel(gameId);
  }

  private flushPendingSubscription(): void {
    const gameId = this.pendingGameId;
    const s = this.socket();
    if (!gameId || !s || !this.isConnected()) return;
    this.pendingGameId = null;
    this.setupGameChannel(gameId);
  }

  private setupGameChannel(gameId: string): void {
    const s = this.socket();
    if (!s) return;

    DevLogger.log(`[Game] Joining game room ${gameId}`);
    s.emit('join_game', gameId);

    s.off('game_state');
    s.on('game_state', (data: any) => {
      const remoteGame = data.game;
      if (!remoteGame || remoteGame.id !== gameId) return;

      DevLogger.log(`[Game] Received authoritative state for ${gameId}`);
      this.gameState.update((state) => {
        // If we don't have a local state yet, use the one from the microservice
        if (!state) {
          return this.mapMicroserviceGameToGameState(remoteGame);
        }

        // Merge microservice state into local state
        return {
          ...state,
          fen: remoteGame.fen,
          turn: remoteGame.turn,
          moves: remoteGame.moves || [],
          white_time_remaining_ms: remoteGame.whiteTimeRemainingMs,
          black_time_remaining_ms: remoteGame.blackTimeRemainingMs,
          server_timestamp: remoteGame.serverTimestamp,
          status: remoteGame.status,
          result: remoteGame.result,
          termination: remoteGame.termination,
          legal_moves: data.legalMoves || remoteGame.legalMoves || [],
          opponent_away_countdown: remoteGame.opponentAwayCountdown,
          // Preserve critical local info if it exists
          my_color: data.playerColor || state.my_color
        };
      });
    });

    s.off('move_made');
    s.on('move_made', (data: any) => {
      if (data.gameId !== gameId) return;

      this.gameState.update((state) => {
        // Fallback: If move arrives before state is loaded, we'll temporarily store it
        // Or better, since we have game_state coming anyway, we just wait for it.
        // But for smoothness, we'll try to apply it if we have a state.
        if (!state) return state;

        return {
          ...state,
          fen: data.fen,
          turn: data.turn,
          moves: [...state.moves, data.move],
          white_time_remaining_ms: data.whiteTimeRemainingMs,
          black_time_remaining_ms: data.blackTimeRemainingMs,
          server_timestamp: data.serverTimestamp,
          status: data.status,
          result: data.result,
          termination: data.termination,
          legal_moves: data.legalMoves,
          draw_offered_by: null,
          draw_offered_at: null,
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

    s.on('game_ended', (data: any) => {
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
          white_rating_change: data.white_rating_change ?? (data.rating_change ? data.rating_change.white : null),
          black_rating_change: data.black_rating_change ?? (data.rating_change ? data.rating_change.black : null),
          draw_offered_by: null,
          draw_offered_at: null,
        };
      });

      this.myActiveGame.update((state) => {
        if (!state || state.id !== gameId) return state;
        return {
          ...state,
          status: 'completed',
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
          white_rating_change: data.white_rating_change ?? (data.rating_change ? data.rating_change.white : null),
          black_rating_change: data.black_rating_change ?? (data.rating_change ? data.rating_change.black : null),
          rating_change: data.rating_change || (data.white_rating_change !== undefined ? { white: data.white_rating_change, black: data.black_rating_change } : undefined)
        });

      this.audioService.playBoardEnd();
    });

    s.on('rematch_offered', (data: any) => {
      this.rematchOffered$.next(data);
    });

    s.on('rematch_accepted', (data: any) => {
      this.rematchAccepted$.next(data);
    });

    s.on('rematch_declined', (data: any) => {
      this.rematchDeclined$.next(data);
    });

    s.on('clock_sync', (data: any) => {
      this.gameState.update((state) => {
        if (!state) return state;
        return {
          ...state,
          white_time_remaining_ms: data.whiteTimeRemainingMs,
          black_time_remaining_ms: data.blackTimeRemainingMs,
          server_timestamp: data.serverTimestamp,
          turn: data.turn || state.turn,
        };
      });
    });
    
    s.on('draw_offered', (data: DrawOfferedPayload) => {
      if (data.gameId !== gameId) return;
      this.gameState.update(g => g ? ({ ...g, draw_offered_by: data.offeredByUserId }) : null);
      this.drawOffered$.next(data);
    });

    s.on('draw_declined', (data: DrawDeclinedPayload) => {
      if (data.gameId !== gameId) return;
      this.gameState.update(g => g ? ({ ...g, draw_offered_by: null }) : null);
      this.drawDeclined$.next(data);
    });

    s.on('opponent_away_countdown', (data: any) => {
      if (data.gameId !== gameId) return;
      const g = this.gameState();
      if (!g) return;
      
      // Update signal ONLY if the user is the one STAYING (not the one who is away)
      if (data.absentPlayerColor !== g.my_color) {
        this.opponentAwayCountdown.set(data.secondsRemaining);
      }
    });

    s.on('opponent_returned', (data: any) => {
      if (data.gameId !== gameId) return;
      this.opponentAwayCountdown.set(null);
    });

    s.on('first_move_countdown', (data: any) => {
      if (data.gameId !== gameId) return;
      this.gameState.update(g => g ? ({ ...g, firstMoveCountdown: data.secondsRemaining }) : null);
    });

    // The initial state is already set by loadGame/checkActiveGame/pollForMatch
    // before calling setupGameChannel. We only need to listen for events now.
  }

  private applyGameDefaults(game: any): GameState {
    const myId = String(this.authService.currentUser()?.uid);
    const whiteId = String(game.white_player_id || game.white_player?.id);
    const myColor: 'white' | 'black' = whiteId === myId ? 'white' : 'black';

    const gameWithDefaults = {
      ...game,
      white_player: game.white_player || { id: game.white_player_id, name: 'White' },
      black_player: game.black_player || { id: game.black_player_id, name: 'Black' },
      fen: game.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: game.turn || 'white',
      moves: game.moves || [],
      white_time_remaining_ms: game.white_time_remaining_ms ?? game.initial_time_ms,
      black_time_remaining_ms: game.black_time_remaining_ms ?? game.initial_time_ms,
      server_timestamp: game.server_timestamp || null,
      my_color: myColor,
      legal_moves: game.legal_moves || [],
    };

    // Defensive: Ensure ratings are mapped from game record if missing in player object
    if (gameWithDefaults.white_player && !gameWithDefaults.white_player.rating && game.white_elo) {
      gameWithDefaults.white_player.rating = game.white_elo;
    }
    if (gameWithDefaults.black_player && !gameWithDefaults.black_player.rating && game.black_elo) {
      gameWithDefaults.black_player.rating = game.black_elo;
    }

    return gameWithDefaults;
  }

  loadGameAndNavigate(gameId: string): void {
    this.isLoading.set(true);
    this.http
      .get<{ game: GameState }>(`${this.apiUrl}/game/${gameId}`)
      .pipe(
        catchError((error) => {
          if (error.status === 503) {
            this.isServiceMaintenance.set(true);
          }
          // Fallback to microservice for live/arena games on ANY error except auth
          if (error.status !== 401 && error.status !== 403) {
            return this.http.get<any>(`${this.socketUrl}/api/games/${gameId}`).pipe(
              map(raw => ({ game: this.mapMicroserviceGameToGameState(raw) })),
              catchError(() => of({ game: null }))
            );
          }
          return of({ game: null });
        })
      )
      .subscribe((res) => {
        this.isLoading.set(false);
        if (res.game) {
          this.isServiceMaintenance.set(false);
          this.myActiveGame.set(res.game);
          this.gameState.set(res.game);
          this.connectSocket();
          this.subscribeToGame(gameId);
          this.startHeartbeat();
          this.router.navigate(['/play', gameId]);
        }
      });
  }

  private mapMicroserviceGameToGameState(raw: any): GameState {
    const myId = String(this.authService.currentUser()?.uid);
    const whiteId = String(raw.whitePlayer?.userId);
    const myColor: 'white' | 'black' = whiteId === myId ? 'white' : 'black';

    return {
      id: raw.id,
      white_player: {
        id: raw.whitePlayer?.userId,
        name: raw.whitePlayer?.name,
        rating: raw.whitePlayer?.rating
      },
      black_player: {
        id: raw.blackPlayer?.userId,
        name: raw.blackPlayer?.name,
        rating: raw.blackPlayer?.rating
      },
      status: raw.status,
      time_control: raw.timeControl,
      initial_time_ms: raw.initialTimeMs,
      increment_ms: raw.incrementMs,
      fen: raw.fen,
      turn: raw.turn,
      moves: raw.moves || [],
      white_time_remaining_ms: raw.whiteTimeRemainingMs,
      black_time_remaining_ms: raw.blackTimeRemainingMs,
      server_timestamp: raw.lastMoveTimestamp || new Date().toISOString(),
      result: raw.result,
      termination: raw.termination,
      white_rating_change: null,
      black_rating_change: null,
      my_color: myColor,
      legal_moves: raw.legalMoves || [],
      draw_offered_by: null,
      draw_offered_at: null,
      arena_id: raw.arenaId
    };
  }

  // ── Heartbeat ───────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      const game = this.gameState();
      if (!game || !this.socket()?.connected || game.status !== 'active') return;
      this.socket()?.emit('heartbeat', { gameId: game.id });
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
    if (this.pollInterval) return;

    let pollCount = 0;
    const maxPolls = 40; // 40 * 3s = 2 minutes
    
    this.pollInterval = setInterval(() => {
      pollCount++;
      
      if (pollCount >= maxPolls || !this.isSearching()) {
        this.stopPolling();
        this.isSearching.set(false);
        return;
      }

      this.http
        .get<{ game: GameState | null }>(`${this.apiUrl}/game/active`)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (res?.game) {
            this.stopPolling();
            if (this.botMatchTimeout) {
              clearTimeout(this.botMatchTimeout);
              this.botMatchTimeout = null;
            }
            this.isSearching.set(false);
            this.audioService.playMatchFound();
            
            const gameWithDefaults = this.applyGameDefaults(res.game);
            this.myActiveGame.set(gameWithDefaults);
            this.gameState.set(gameWithDefaults);
            
            this.connectSocket();
            this.subscribeToGame(res.game.id);
            this.startHeartbeat();
            this.router.navigate(['/play', res.game.id]);
          }
        });
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // ── PGN Fetching ─────────────────────────────────────────────────

  fetchPgnFromLichess(gameUrl: string): Observable<string> {
    const match = gameUrl.match(/lichess\.org\/([a-zA-Z0-9]+)/);
    if (!match) {
      DevLogger.log('[GameService] Invalid game URL:', gameUrl);
      return of('');
    }
    const gameId = match[1];
    DevLogger.log('[GameService] Fetching game:', gameId);
    return this.http.get(`https://lichess.org/game/export/${gameId}?pgnInJson=true`, {
      responseType: 'text',
    }).pipe(
      catchError((err) => {
        DevLogger.log('[GameService] Fetch error:', err);
        return of('');
      })
    );
  }
}
