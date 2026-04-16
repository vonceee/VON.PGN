import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TvService } from '../../core/services/tv.service';
import { GameService } from '../../core/services/game.service';
import { AudioService } from '../../core/services/audio.service';
import { ChessBoardComponent } from '../../shared/components/chess-board/chess-board.component';
import { ChessClockComponent } from '../../shared/components/chess-clock/chess-clock.component';
import { GameInfoComponent } from '../play/live-game/components/game-info.component';
import { MoveNotationComponent } from '../../shared/components/move-notation/move-notation.component';
import { GameControlsComponent } from '../play/live-game/components/game-controls.component';
import { Chess } from 'chess.js';
import { Config } from 'chessground/config';

@Component({
  selector: 'app-tv',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ChessBoardComponent,
    ChessClockComponent,
    GameInfoComponent,
    MoveNotationComponent,
  ],
  templateUrl: './tv.component.html',
  styleUrls: ['./tv.component.css'],
})
export class TvComponent implements OnInit, OnDestroy {
  tvService = inject(TvService);
  gameService = inject(GameService);
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);
  private router = inject(Router);

  readonly STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  readonly placeholderPlayer = { id: 0, name: '...' };

  boardSize = signal<number>(this.calculateInitialBoardSize());
  currentPly = signal(0);
  chess = new Chess();
  displayFen = signal<string>(this.STARTING_FEN);
  private moveSanCache = signal<string[]>([]);

  selectedTvGame = computed(() => {
    const state = this.tvService.tvState();
    return state.rapid || state.blitz || state.bullet || null;
  });

  game = this.gameService.gameState;

  constructor() {
    // Watch for featured TV game changes and load full state via GameService
    effect(() => {
      const tvGame = this.selectedTvGame();
      if (tvGame?.gameId) {
        const currentId = this.gameService.gameState()?.id;
        if (currentId !== tvGame.gameId) {
          this.gameService.loadGame(tvGame.gameId);
          this.currentPly.set(0);
        }
      } else if (this.gameService.gameState()) {
        // Clear state if no game is featured on TV
        this.gameService.clearGame(false);
      }
    });

    // Sync chess instance and display when global game state updates
    effect(() => {
      const g = this.game();
      if (g) {
        this.chess.load(g.fen);
        this.rebuildSanCache();
        this.currentPly.set(g.moves.length);
        this.displayFen.set(g.fen);

        if (isPlatformBrowser(this.platformId)) {
          document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
        }
      } else {
        this.displayFen.set(this.STARTING_FEN);
      }
    });
  }

  private calculateInitialBoardSize(): number {
    if (isPlatformBrowser(this.platformId)) {
      const vh = window.innerHeight;
      return Math.min(600, vh - 280);
    }
    return 600;
  }

  onBoardSizeChange(event: number) {
    this.boardSize.set(event);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--board-size', `${event}px`);
    }
  }

  rebuildSanCache(): void {
    const g = this.game();
    if (!g) return;

    const newCache: string[] = [];
    const tempChess = new Chess();
    tempChess.reset();

    for (const uci of g.moves) {
      if (!uci || uci.length < 4) {
        newCache.push(uci);
        continue;
      }
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      try {
        const result = tempChess.move({ from, to, promotion: promotion as any });
        if (result) {
          newCache.push(result.san);
        } else {
          newCache.push(uci);
        }
      } catch {
        newCache.push(uci);
      }
    }
    this.moveSanCache.set(newCache);
  }

  moveRounds = computed(() => {
    const g = this.game();
    const san = this.moveSanCache();
    if (!g) return [];
    const rounds = [];
    for (let i = 0; i < g.moves.length; i += 2) {
      rounds.push({
        num: Math.floor(i / 2) + 1,
        white: san[i] ?? g.moves[i],
        black: i + 1 < g.moves.length ? san[i + 1] ?? g.moves[i + 1] : null,
        whiteIndex: i,
        blackIndex: i + 1,
      });
    }
    return rounds;
  });

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
        try { tempChess.move({ from, to, promotion: promotion as any }); } catch {}
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
    if (result === '1/2-1/2') return 'text-slate-400';
    return result === '1-0' ? 'text-green-500' : 'text-red-500';
  }

  cgConfig = computed(() => {
    const g = this.game();
    if (!g) return {};
    return {
      turnColor: g.turn,
      viewOnly: true,
      movable: { color: undefined, dests: new Map() },
      check: this.chess.inCheck() ? (this.chess.turn() === 'w' ? 'white' : 'black') : undefined,
    } as Config;
  });
  ngOnInit() {
    this.tvService.joinTv();
  }

  ngOnDestroy() {
    this.tvService.leaveTv();
    this.gameService.clearGame(false);
  }
  goToGame(gameId: string | undefined) {
    if (gameId) {
      this.router.navigate(['/play', gameId]);
    }
  }
}
