import {
  Component,
  ViewChild,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  PLATFORM_ID,
  HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TacticsService, Puzzle, SolveResponse, PuzzleAttempt } from '../../core/services/tactics.service';
import { GameService } from '../../core/services/game.service';
import { UserService } from '../../core/services/user.service';
import { Chess, Move } from 'chess.js';
import { MoveNotationComponent } from '@shared/chess';
import { TacticsBoardComponent } from '@shared/chess';
import { LoadingComponent } from '@shared/feedback';
import { ButtonComponent } from '@shared/ui';
import { DevLogger } from '../../core/utils/dev-logger';
import { PUZZLE_THEMES_HIERARCHY } from './themes/puzzle-themes.config';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [
    CommonModule,
    TacticsBoardComponent,
    LoadingComponent,
    ButtonComponent,
    MoveNotationComponent,
  ],
  templateUrl: './tactics.component.html',
  host: {
    class: 'absolute inset-0 overflow-hidden',
  },
})
export class TacticsComponent implements OnInit, OnDestroy {
  private tacticsService = inject(TacticsService);
  private gameService = inject(GameService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private chess = new Chess();
  private gameStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  activeTheme = signal<string | null>(null);

  activeThemeName = computed(() => {
    const key = this.activeTheme();
    if (!key) return null;
    if (key === 'mix') return 'Recommended Mix';

    for (const category of PUZZLE_THEMES_HIERARCHY) {
      const found = category.themes.find(t => t.key === key);
      if (found) return found.name;
    }
    return key;
  });

  constructor() { }

  currentUser = this.userService.currentUser;
  puzzleHistory = signal<PuzzleAttempt[]>([]);

  @ViewChild(TacticsBoardComponent) boardComponent!: TacticsBoardComponent;

  currentPuzzle = signal<Puzzle | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  hasRevealedSolution = signal<boolean>(false);
  userColor = signal<'white' | 'black'>('white');
  status = signal<'playing' | 'success' | 'failed'>('playing');
  ratingChange = signal<number | null>(null);
  newRating = signal<number | null>(null);
  newStreak = signal<number>(0);
  userRating = computed(() => this.userService.currentUser()?.progress?.puzzleRating ?? 1200);
  userStreak = computed(() => this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
  retryMode = signal(false);
  exploreMode = signal(false);
  isReviewMode = signal(false);
  isLoadingPgn = signal(false);
  pgnMoves = signal<string[]>([]);
  basePgnMoves = signal<string[]>([]);
  currentPly = signal(0);
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  puzzleStartPly = signal(0);
  fullPgnMoves: string[] = [];
  isMobile = signal(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  boardSize = signal(600);


  private sizeEffect = effect(() => {
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
    }
  });

  ngOnInit() {
    this.onResize();
    if (this.currentUser()) {
      this.loadHistory();
      setTimeout(() => {
        this.userService.loadMyProfile().subscribe(() => {
          this.newStreak.set(this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
        });
      });
    }

    this.route.paramMap.subscribe(params => {
      const theme = params.get('theme');
      this.activeTheme.set(theme);
      this.loadNextPuzzle();
    });
  }

  ngOnDestroy() {

  }


  @HostListener('window:resize')
  onResize() {
    if (!isPlatformBrowser(this.platformId)) return;
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
  }

  loadNextPuzzle(puzzleId?: number) {
    this.status.set('playing');
    this.ratingChange.set(null);
    this.isLoading.set(true);
    this.hasError.set(false);
    this.hasRevealedSolution.set(false);
    this.retryMode.set(false);
    this.exploreMode.set(false);
    this.isReviewMode.set(!!puzzleId);
    this.isLoadingPgn.set(true);
    this.pgnMoves.set([]);
    this.currentPly.set(0);

    this.tacticsService.getDailyPuzzle(this.activeTheme() ?? undefined, puzzleId).subscribe({
      next: (res: { data: Puzzle }) => {
        // Synchronize internal chess state and FEN before triggering board init
        try {
          this.chess.load(res.data.fen);
          this.currentFen.set(res.data.fen);
        } catch (e) {
          DevLogger.warn('[Tactics] Failed to load puzzle FEN:', e);
        }

        this.currentPuzzle.set(res.data);
        this.isLoading.set(false);
        this.loadGameWithPuzzle(res.data);
      },
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
  }

  loadHistory() {
    if (this.currentUser()) {
      this.tacticsService.getPuzzleHistory().subscribe({
        next: (res) => {
          this.puzzleHistory.set(res.data);
        },
        error: (err) => {
          DevLogger.error('[Tactics] Failed to load puzzle history:', err);
        }
      });
    }
  }

  selectHistoryPuzzle(puzzleId: number) {
    this.loadNextPuzzle(puzzleId);
  }

  private loadGameWithPuzzle(puzzle: Puzzle) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!puzzle.game_url) {
      this.isLoadingPgn.set(false);
      return;
    }

    const parsed = this.parseGameUrl(puzzle.game_url);
    if (!parsed.gameId) {
      DevLogger.warn('[Tactics] Could not parse gameId from URL:', puzzle.game_url);
      this.isLoadingPgn.set(false);
      return;
    }

    this.puzzleStartPly.set(parsed.ply);

    this.gameService.fetchPgnFromLichess(puzzle.game_url).subscribe({
      next: (pgn: string) => {
        this.isLoadingPgn.set(false);
        if (pgn && pgn.length > 0) {
          const currentSessionMoves = [...this.pgnMoves()];
          this.parsePgn(pgn);
          this.fullPgnMoves = [...this.pgnMoves()];

          let base: string[] = [];
          if (parsed.ply > 0 && this.fullPgnMoves.length > parsed.ply) {
            base = this.fullPgnMoves.slice(0, parsed.ply);
          } else {
            base = [...this.fullPgnMoves];
          }

          this.basePgnMoves.set(base);

          let mergedMoves = [...base];
          if (base.length > 0 && currentSessionMoves.length > 0) {
            const lastBase = base[base.length - 1];
            const firstSession = currentSessionMoves[0];
            if (lastBase === firstSession || lastBase.replace(/[#+]+$/, '') === firstSession.replace(/[#+]+$/, '')) {
              mergedMoves = [...base.slice(0, -1), ...currentSessionMoves];
            } else {
              mergedMoves = [...base, ...currentSessionMoves];
            }
          } else {
            mergedMoves = [...base, ...currentSessionMoves];
          }

          this.pgnMoves.set(mergedMoves);

          // Sync internal chess state and currentFen with the FINAL merged moves
          this.chess.load(this.gameStartFen);
          try {
            mergedMoves.forEach(m => {
              try {
                this.chess.move(m);
              } catch (e) {
                // If a move fails during sync, it might be a duplicate or slightly different SAN
                // We attempt to continue to keep the state as close as possible
                DevLogger.warn('[Tactics] Sync move failed:', m, e);
              }
            });
            this.currentFen.set(this.chess.fen());

            if (this.boardComponent) {
              this.boardComponent.setGameMoves(mergedMoves);

              // No need for explicit playIntro call here, 
              // the board's initPuzzle handles the first solution move animation.
              // Just ensure lastMove highlight is synced.
              const history = this.chess.history({ verbose: true });
              const last = history[history.length - 1];
              if (last) {
                this.boardComponent.lastMove = [last.from, last.to];
              }
            }
          } catch (e) {
            DevLogger.warn('[Tactics] Failed to sync chess state for merged moves:', e);
          }

          this.currentPly.set(mergedMoves.length);
        } else {
          DevLogger.warn('[Tactics] PGN fetched but empty');
        }
      },
      error: (err: Error) => {
        DevLogger.error('[Tactics] Error fetching PGN:', err);
        this.isLoadingPgn.set(false);
      },
    });
  }

  private loadGameOnBoard() {
    if (this.pgnMoves().length === 0) return;

    if (this.boardComponent) {
      this.boardComponent.loadGame(this.pgnMoves());
    }
  }

  private parseGameUrl(url: string): { gameId: string; perspective: 'white' | 'black'; ply: number } {
    const match = url.match(/lichess\.org\/([a-zA-Z0-9]+)(?:\/(\w+))?#(\d+)/);
    if (!match) {
      return { gameId: '', perspective: 'white', ply: 0 };
    }
    return {
      gameId: match[1],
      perspective: (match[2] as 'white' | 'black') || 'white',
      ply: parseInt(match[3], 10) || 0,
    };
  }

  onPuzzleSolved() {
    this.status.set('success');

    if (this.currentUser()) {
      const pId = this.currentPuzzle()?.id;
      if (!pId) return;

      if (this.retryMode()) {
        this.retryMode.set(false);
        this.exploreMode.set(true);
      } else if (this.isReviewMode()) {
        this.ratingChange.set(0);
        this.newRating.set(this.userRating());
        this.newStreak.set(this.userStreak());
        this.exploreMode.set(true);
      } else {
        this.tacticsService.solvePuzzle(pId, true).subscribe({
          next: (res: SolveResponse) => {
            this.ratingChange.set(res.rating_change);
            this.newRating.set(res.new_rating);
            this.newStreak.set(res.new_streak);
            this.userService.loadMyProfile().subscribe();
            this.loadHistory();
            this.exploreMode.set(true);
          },
          error: (err) => {
            DevLogger.error('[Tactics] Failed to submit puzzle solve:', err);
            this.exploreMode.set(true);
          }
        });
      }
    } else {
      this.exploreMode.set(true);
    }
  }

  onPuzzleFailed() {
    this.status.set('failed');

    if (this.currentUser()) {
      if (this.isReviewMode()) {
        this.ratingChange.set(0);
        this.newRating.set(this.userRating());
        this.newStreak.set(this.userStreak());
      } else {
        this.newStreak.set(0);

        const pId = this.currentPuzzle()?.id;
        if (!pId) return;

        this.tacticsService.solvePuzzle(pId, false).subscribe({
          next: (res: any) => {
            this.ratingChange.set(res.rating_change);
            this.newRating.set(res.new_rating);
            this.newStreak.set(res.new_streak);
            this.userService.loadMyProfile().subscribe();
            this.loadHistory();
          },
          error: (err) => {
            DevLogger.error('[Tactics] Failed to submit puzzle failure:', err);
          }
        });
      }
    }
  }

  onWrongMove() {
    this.status.set('failed');

    if (this.currentUser()) {
      if (this.isReviewMode()) {
        this.ratingChange.set(0);
        this.newRating.set(this.userRating());
        this.newStreak.set(this.userStreak());
        this.resetToInitialPuzzleState();
      } else {
        this.newStreak.set(0);

        const pId = this.currentPuzzle()?.id;
        if (!pId) return;

        this.tacticsService.solvePuzzle(pId, false).subscribe({
          next: (res: SolveResponse) => {
            this.ratingChange.set(res.rating_change);
            this.newRating.set(res.new_rating);
            this.newStreak.set(res.new_streak);
            this.userService.loadMyProfile().subscribe();
            this.loadHistory();
            this.resetToInitialPuzzleState();
          },
          error: (err) => {
            DevLogger.error('[Tactics] Failed to submit wrong move:', err);
            this.resetToInitialPuzzleState();
          }
        });
      }
    } else {
      this.resetToInitialPuzzleState();
    }
  }

  private resetToInitialPuzzleState() {
    this.retryMode.set(true);

    // The board resets to initialFen, which includes the first computer move.
    // We should keep the computer move in pgnMoves and sync this.chess.
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    try {
      this.chess.load(puzzle.fen);
      const solutionMoves = puzzle.moves.split(' ');
      if (solutionMoves.length > 0) {
        const moveResult = this.chess.move(this.parseUciMove(solutionMoves[0]));
        if (moveResult) {
          const base = this.basePgnMoves();
          this.pgnMoves.set([...base, moveResult.san]);
          this.currentFen.set(this.chess.fen());
        }
      }
    } catch (e) {
      DevLogger.warn('[Tactics] Failed to reset to initial puzzle state:', e);
    }

    this.currentPly.set(this.pgnMoves().length);
  }

  private parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
    return {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci.substring(4, 5) : undefined,
    };
  }

  onUserColorChange(color: 'white' | 'black') {
    this.userColor.set(color);
  }

  onPuzzleMoveMade(san: string) {
    this.pgnMoves.update((moves: string[]) => {
      if (moves.length > 0 && moves[moves.length - 1] === san) return moves;
      return [...moves, san];
    });

    if (this.boardComponent) {
      this.boardComponent.setGameMoves(this.pgnMoves());
    }
    this.currentPly.set(this.pgnMoves().length);

    // Update internal chess state and FEN
    try {
      this.chess.move(san);
      this.currentFen.set(this.chess.fen());
    } catch (e) {
      DevLogger.warn('[Tactics] Could not update FEN for move:', san, e);
    }
  }

  revealSolution() {
    this.hasRevealedSolution.set(true);
    if (this.boardComponent) {
      this.boardComponent.revealSolution();
    }
  }

  loadGameReview() {
    if (this.fullPgnMoves.length > 0 && this.boardComponent) {
      this.pgnMoves.set(this.fullPgnMoves);

      const solvedPly = this.puzzleStartPly() + this.boardComponent.solutionPly;
      this.currentPly.set(solvedPly);

      this.boardComponent.setGameModeAtMove(this.fullPgnMoves, solvedPly);
    }
  }

  private parsePgn(pgn: string) {
    let realPgn = pgn;
    try {
      const parsed = JSON.parse(pgn);
      if (parsed && parsed.pgn) {
        realPgn = parsed.pgn;
      }
    } catch (e) {
      // Not a JSON string, keep raw pgn
    }

    // Strip comments (like Lichess [%clk ...] or [%eval ...]) that can choke the strict peg.js parser in chess.js
    const cleanPgn = realPgn.replace(/\{[^{}]*\}/g, '').replace(/\{[^{}]*\}/g, '');

    const fenMatch = cleanPgn.match(/\[FEN\s+"([^"]+)"\]/i);
    this.gameStartFen = fenMatch ? fenMatch[1] : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    try {
      const tempChess = new Chess();
      tempChess.loadPgn(cleanPgn);
      const moves = tempChess.history();
      this.pgnMoves.set(moves);
    } catch (e) {
      DevLogger.warn('[Tactics] Robust PGN parsing failed, falling back to manual regex:', e);
      const moves: string[] = [];

      const jsonMatch = realPgn.match(/\{.*"moves"\s*:\s*"([^"]*)"/);
      if (jsonMatch && jsonMatch[1]) {
        const movesStr = jsonMatch[1];
        const moveParts = movesStr.split(' ');
        for (const part of moveParts) {
          if (part && part.trim() && !part.match(/^\d+\.*$/)) {
            if (part.length >= 2 && part.length <= 10) {
              moves.push(part);
            }
          }
        }
        this.pgnMoves.set(moves);
        return;
      }

      const moveRegex = /\d+\.\s*([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#?=!]*)\s*([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#?=!]*)?/g;

      let match;
      while ((match = moveRegex.exec(realPgn)) !== null) {
        if (match[1] && match[1] !== 'e.p.' && match[1] !== 'ep') moves.push(match[1]);
        if (match[2] && match[2] !== 'e.p.' && match[2] !== 'ep') moves.push(match[2]);
      }

      this.pgnMoves.set(moves);
    }
  }

  goToMove(ply: number) {
    if (!this.boardComponent) return;

    if (ply < 0 || ply > this.pgnMoves().length) return;

    if (ply === this.pgnMoves().length && this.status() === 'playing') {
      this.boardComponent.exitGameMode();
      this.currentPly.set(ply);
      return;
    }

    this.boardComponent.setGameModeAtMove(this.pgnMoves(), ply);
    this.currentPly.set(ply);

    // Update internal chess state and FEN
    this.chess.load(this.gameStartFen);
    const moves = this.pgnMoves();
    try {
      for (let i = 0; i < ply; i++) {
        this.chess.move(moves[i]);
      }
      this.currentFen.set(this.chess.fen());

      const history = this.chess.history({ verbose: true });
      const last = history[history.length - 1];
      if (last && this.boardComponent) {
        this.boardComponent.lastMove = [last.from, last.to];
      } else if (this.boardComponent) {
        this.boardComponent.lastMove = undefined;
      }
    } catch (e) {
      DevLogger.warn('[Tactics] Failed to set chess state for ply:', ply, e);
    }
  }
}


