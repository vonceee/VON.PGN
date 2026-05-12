import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArenaService, ArenaParticipant } from '../../core/services/arena.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { ButtonComponent } from '@shared/ui';
import { GameInfoComponent } from '../play/live-game/components/game-info.component';
import { UserHovercardDirective } from '@shared/directives';
import { ChessBoardComponent, ChessClockComponent } from '@shared/chess';
import { Chess } from 'chess.js';
import { Config } from 'chessground/config';
import { ArenaChatComponent } from './arena-chat/arena-chat.component';

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    ChessBoardComponent,
    ChessClockComponent,
    GameInfoComponent,
    UserHovercardDirective,
    RouterLink,
    ArenaChatComponent,
  ],
  templateUrl: './arena.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class ArenaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  public arenaService = inject(ArenaService);
  public authService = inject(AuthService);
  private gameService = inject(GameService);

  readonly STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  readonly placeholderPlayer = { id: 0, name: '...' };

  arenaId = signal<string | null>(null);
  selectedGameId = signal<string | null>(null);

  // Official arena data from Laravel
  arenaData = this.arenaService.activeArena;

  // Board signals
  currentPly = signal(0);
  chess = new Chess();
  displayFen = signal<string>(this.STARTING_FEN);
  game = this.gameService.gameState;

  // Computed properties for UI
  leaderboard = this.arenaService.leaderboard;
  isWaiting = this.arenaService.isWaiting;
  countdown = this.arenaService.countdown;
  countdownLabel = this.arenaService.countdownLabel;

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  paginatedLeaderboard = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.leaderboard().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.ceil(this.leaderboard().length / this.pageSize()) || 1;
  });

  myRank = computed(() => {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) return 0;
    return this.leaderboard().findIndex((p) => p.userId === userId) + 1;
  });

  topThree = computed(() => {
    return this.leaderboard().slice(0, 3);
  });

  isPast = computed(() => {
    return this.arenaData()?.status === 'past';
  });

  winner = computed(() => {
    if (this.isPast()) {
      return this.arenaData()?.winner;
    }
    return null;
  });

  cgConfig = computed(() => {
    const g = this.game();
    if (!g) return {};
    return {
      turnColor: g.turn,
      viewOnly: true,
      movable: { color: undefined, dests: new Map() },
      check: this.chess.inCheck() ? (this.chess.turn() === 'w' ? 'white' : 'black') : undefined,
      coordinates: false,
    } as Config;
  });

  constructor() {
    // Watch for top game changes or manual selection
    effect(() => {
      const targetId = this.selectedGameId() || this.arenaService.topGameId();
      
      if (targetId) {
        const currentId = this.gameService.gameState()?.id;
        if (currentId !== targetId) {
          console.log(`[Arena] Loading game ${targetId} (Manual: ${!!this.selectedGameId()})`);
          this.gameService.loadGame(targetId);
          this.currentPly.set(0);
          
          // Retry once after 2 seconds if load failed
          setTimeout(() => {
            const current = this.gameService.gameState();
            const activeTarget = this.selectedGameId() || this.arenaService.topGameId();
            if (activeTarget === targetId && (!current || current.id !== targetId)) {
                console.log(`[Arena] Retrying load for game ${targetId}...`);
                this.gameService.loadGame(targetId);
            }
          }, 2000);
        }
      } else {
        this.gameService.clearGame(false);
      }
    });

    // Cleanup: If manually selected game is no longer active, reset to top game
    effect(() => {
        const selectedId = this.selectedGameId();
        if (selectedId) {
            const stillActive = this.arenaService.topGames().some(g => g.gameId === selectedId);
            if (!stillActive) {
                console.log(`[Arena] Selected game ${selectedId} ended, returning to top board.`);
                this.selectedGameId.set(null);
            }
        }
    }, { allowSignalWrites: true });

    // Sync chess instance and display when game state updates
    effect(() => {
      const g = this.game();
      if (g) {
        this.chess.load(g.fen);
        this.currentPly.set(g.moves.length);
        this.displayFen.set(g.fen);
      } else {
        this.displayFen.set(this.STARTING_FEN);
      }
    });

  }


  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.arenaId.set(id);
      this.connectAndJoin();
    }
  }

  ngOnDestroy(): void {}

  private connectAndJoin() {
    const user = this.authService.currentUser();
    if (user && this.arenaId()) {
      // Ensure socket is connected
      this.gameService.connectSocket();

      // Delay slightly to ensure socket is ready
      setTimeout(() => {
        this.arenaService.joinArena(
          this.arenaId()!,
          user.username || 'Player',
          1500, // TODO: Get actual rating
        );
      }, 500);
    }
  }

  goToMove(ply: number): void {
    const g = this.game();
    if (!g || ply < 0 || ply > g.moves.length) return;

    this.currentPly.set(ply);
    const tempChess = new Chess();
    for (let i = 0; i < ply; i++) {
      const uci = g.moves[i];
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      try {
        tempChess.move({ from, to, promotion: promotion as any });
      } catch {}
    }
    this.displayFen.set(tempChess.fen());
  }

  formatResult(result: string | null): string {
    return result || '';
  }

  formatTermination(result: string | null, termination: string | null): string {
    if (!termination) return '';
    if (result === '1/2-1/2') return 'Draw';
    return termination.toLowerCase();
  }

  getResultClass(result: string | null): string {
    if (result === '1/2-1/2') return '';
    return result === '1-0' ? 'text-green-500' : 'text-red-500';
  }

  toggleJoin() {
    if (this.isWaiting()) {
      this.arenaService.stopPairing();
    } else {
      this.arenaService.startPairing();
    }
  }

  selectGame(gameId: string) {
    if (this.selectedGameId() === gameId) {
      // Toggle off if clicking the same game
      this.selectedGameId.set(null);
    } else {
      this.selectedGameId.set(gameId);
    }
  }

  getFireLevel(streak: number): number {
    if (streak >= 4) return 2;
    if (streak >= 2) return 1;
    return 0;
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }
}
