import { Injectable, inject, signal, computed, effect, untracked, NgZone } from '@angular/core';
import { GameService } from '../../../core/services/game.service';
import { PieceType, BughouseTvState } from '../../../core/models/bughouse.model';

@Injectable({
  providedIn: 'root'
})
export class BughouseTvService {
  private gameService = inject(GameService);
  private ngZone = inject(NgZone);

  tvGameId = signal<string | null>(null);
  tvBoardAFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  tvBoardBFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  
  tvPocketA_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  tvPocketA_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  tvPocketB_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  tvPocketB_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  
  tvTimeA_W = signal<number>(300);
  tvTimeA_B = signal<number>(300);
  tvTimeB_W = signal<number>(300);
  tvTimeB_B = signal<number>(300);
  
  tvTurnA = computed(() => this.tvBoardAFen().split(' ')[1] as 'w' | 'b');
  tvTurnB = computed(() => this.tvBoardBFen().split(' ')[1] as 'w' | 'b');
  
  tvGameActive = signal<boolean>(false);
  tvWinner = signal<string | null>(null);
  
  tvBoardAWhiteName = signal<string>('');
  tvBoardABlackName = signal<string>('');
  tvBoardBWhiteName = signal<string>('');
  tvBoardBBlackName = signal<string>('');

  ongoingMatches = signal<any[]>([]);

  tvState = computed<BughouseTvState | null>(() => {
    const gameId = this.tvGameId();
    if (!gameId) return null;
    return {
      gameId,
      isActive: this.tvGameActive(),
      winner: this.tvWinner(),
      boardA: {
        fen: this.tvBoardAFen(),
        pocketW: this.tvPocketA_W(),
        pocketB: this.tvPocketA_B(),
        timeW: this.tvTimeA_W(),
        timeB: this.tvTimeA_B(),
        turn: this.tvTurnA(),
        whiteName: this.tvBoardAWhiteName(),
        blackName: this.tvBoardABlackName(),
      },
      boardB: {
        fen: this.tvBoardBFen(),
        pocketW: this.tvPocketB_W(),
        pocketB: this.tvPocketB_B(),
        timeW: this.tvTimeB_W(),
        timeB: this.tvTimeB_B(),
        turn: this.tvTurnB(),
        whiteName: this.tvBoardBWhiteName(),
        blackName: this.tvBoardBBlackName(),
      },
    };
  });

  constructor() {
    // Reactive Room switching for TV Stream
    effect((onCleanup) => {
      const socket = this.gameService.socket();
      const currentTvId = this.tvGameId();
      if (socket && socket.connected && currentTvId) {
        socket.emit('bughouse_spectate', { gameId: currentTvId });
        
        onCleanup(() => {
          socket.emit('bughouse_leave_spectate', { gameId: currentTvId });
        });
      }
    });

    // Setup socket listeners when socket is available
    effect((onCleanup) => {
      const socket = this.gameService.socket();
      if (socket) {
        untracked(() => {
          const setup = () => {
            this.setupSocketListeners();
          };

          if (socket.connected) {
            setup();
          } else {
            socket.on('connect', setup);
          }

          onCleanup(() => {
            socket.off('connect', setup);
            this.removeSocketListeners();
          });
        });
      }
    });
  }

  resetTvGameState() {
    this.tvBoardAFen.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.tvBoardBFen.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.tvPocketA_W.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvPocketA_B.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvPocketB_W.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvPocketB_B.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvTimeA_W.set(300);
    this.tvTimeA_B.set(300);
    this.tvTimeB_W.set(300);
    this.tvTimeB_B.set(300);
    this.tvGameActive.set(false);
    this.tvWinner.set(null);
    this.tvBoardAWhiteName.set('');
    this.tvBoardABlackName.set('');
    this.tvBoardBWhiteName.set('');
    this.tvBoardBBlackName.set('');
  }

  private handleActiveGames = (games: any[]) => {
    this.ngZone.run(() => {
      this.ongoingMatches.set(games);

      const currentTvId = this.tvGameId();
      if (games.length > 0) {
        if (!currentTvId || !games.some((g) => g.gameId === currentTvId)) {
          this.tvGameId.set(games[0].gameId);
        }
      } else {
        this.tvGameId.set(null);
        this.resetTvGameState();
      }
    });
  };

  private handleGameStart = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.tvGameId()) {
        this.tvBoardAFen.set(data.boardAFen);
        this.tvBoardBFen.set(data.boardBFen);
        this.tvPocketA_W.set({ ...data.pockets.A_W });
        this.tvPocketA_B.set({ ...data.pockets.A_B });
        this.tvPocketB_W.set({ ...data.pockets.B_W });
        this.tvPocketB_B.set({ ...data.pockets.B_B });
        this.tvTimeA_W.set(data.clocks.A_W);
        this.tvTimeA_B.set(data.clocks.A_B);
        this.tvTimeB_W.set(data.clocks.B_W);
        this.tvTimeB_B.set(data.clocks.B_B);
        this.tvGameActive.set(true);
        this.tvWinner.set(null);

        const colorsMap: Record<string, { board: string; color: string }> = data.colors ?? {};
        const allPlayers = [
          { id: String(data.teamA.captainId), name: data.teamA.captainName },
          { id: String(data.teamA.partnerId), name: data.teamA.partnerName },
          { id: String(data.teamB.captainId), name: data.teamB.captainName },
          { id: String(data.teamB.partnerId), name: data.teamB.partnerName },
        ];
        for (const player of allPlayers) {
          const a = colorsMap[player.id];
          if (!a) continue;
          if (a.board === 'A' && a.color === 'w') this.tvBoardAWhiteName.set(player.name);
          if (a.board === 'A' && a.color === 'b') this.tvBoardABlackName.set(player.name);
          if (a.board === 'B' && a.color === 'w') this.tvBoardBWhiteName.set(player.name);
          if (a.board === 'B' && a.color === 'b') this.tvBoardBBlackName.set(player.name);
        }
      }
    });
  };

  private handleMoveBroadcast = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.tvGameId()) {
        if (data.board === 'A') {
          this.tvBoardAFen.set(data.fen);
        } else {
          this.tvBoardBFen.set(data.fen);
        }
        this.tvPocketA_W.set({ ...data.pockets.A_W });
        this.tvPocketA_B.set({ ...data.pockets.A_B });
        this.tvPocketB_W.set({ ...data.pockets.B_W });
        this.tvPocketB_B.set({ ...data.pockets.B_B });
      }
    });
  };

  private handleClockTick = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.tvGameId()) {
        this.tvTimeA_W.set(data.clocks.A_W);
        this.tvTimeA_B.set(data.clocks.A_B);
        this.tvTimeB_W.set(data.clocks.B_W);
        this.tvTimeB_B.set(data.clocks.B_B);
      }
    });
  };

  private handleGameOver = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.tvGameId()) {
        this.tvGameActive.set(false);
        this.tvWinner.set(data.winner);

        setTimeout(() => {
          this.ngZone.run(() => {
            if (this.tvGameId() === data.gameId) {
              const activeGames = this.ongoingMatches();
              const remaining = activeGames.filter((g) => g.gameId !== data.gameId);
              if (remaining.length > 0) {
                this.tvGameId.set(remaining[0].gameId);
              } else {
                this.tvGameId.set(null);
                this.resetTvGameState();
              }
            }
          });
        }, 5000);
      }
    });
  };

  private setupSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

    this.removeSocketListeners();

    socket.on('bughouse_active_games', this.handleActiveGames);
    socket.on('bughouse_game_start', this.handleGameStart);
    socket.on('bughouse_move_broadcast', this.handleMoveBroadcast);
    socket.on('bughouse_clock_tick', this.handleClockTick);
    socket.on('bughouse_game_over', this.handleGameOver);
  }

  private removeSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

    socket.off('bughouse_active_games', this.handleActiveGames);
    socket.off('bughouse_game_start', this.handleGameStart);
    socket.off('bughouse_move_broadcast', this.handleMoveBroadcast);
    socket.off('bughouse_clock_tick', this.handleClockTick);
    socket.off('bughouse_game_over', this.handleGameOver);
  }
}
