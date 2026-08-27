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
import { UserService } from '../../core/services/user.service';
import { Chess, Move } from 'chess.js';
import { MoveNotationComponent } from '@shared/chess';
import { TacticsBoardComponent } from '@shared/chess';
import { DevLogger } from '../../core/utils/dev-logger';
import { getPlyFromFen } from '../../core/utils/chess-tree.utils';
import { PUZZLE_THEMES_HIERARCHY } from './themes/puzzle-themes.config';
import { EngineService } from '../../core/services/engine.service';
import { ToggleComponent } from '@shared/ui';
import { StudyAnalysisComponent } from '../study/study-analysis/study-analysis.component';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEye } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [
    CommonModule,
    TacticsBoardComponent,
    MoveNotationComponent,
    NgIconComponent,
    ToggleComponent,
    StudyAnalysisComponent,
  ],
  providers: [
    provideIcons({
      heroEye,
    }),
  ],
  templateUrl: './tactics.component.html',
  host: {
    class: 'absolute inset-0 overflow-y-auto lg:overflow-hidden',
  },
})
export class TacticsComponent implements OnInit, OnDestroy {
  private tacticsService = inject(TacticsService);
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

  engineService = inject(EngineService);

  // Engine analysis properties
  isEngineActive = signal(false);
  showEngineSettings = signal(false);
  
  engineDepth = this.engineService.engineDepth;
  engineNodes = this.engineService.engineNodes;
  engineNps = this.engineService.engineNps;
  isEngineError = this.engineService.isError;
  pvLines = this.engineService.pvLines;
  multiPv = this.engineService.multiPv;
  searchMode = this.engineService.searchMode;

  formattedPvLines = computed(() => {
    const lines = this.pvLines();
    const fen = this.currentFen();
    if (lines.length === 0 || !fen) return [];

    return lines.map((line) => {
      const chess = new Chess(fen);
      const moves: {
        san: string;
        uci: string;
        moveNumber: number;
        showMoveNumber: boolean;
        isBlack: boolean;
      }[] = [];

      for (let i = 0; i < line.pv.length; i++) {
        const uci = line.pv[i];
        const currentTurn = chess.turn();
        const currentMoveNumber = chess.moveNumber();
        const showMoveNumber = i === 0 || currentTurn === 'w';
        const isBlack = i === 0 && currentTurn === 'b';

        try {
          const from = uci.substring(0, 2);
          const to = uci.substring(2, 4);
          const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;
          const result = chess.move({ from, to, promotion });
          moves.push({
            san: result.san,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        } catch (e) {
          moves.push({
            san: uci,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        }
      }

      return {
        ...line,
        moves,
      };
    });
  });

  formattedNps = computed(() => {
    const nps = this.engineNps();
    if (nps >= 1_000_000) return `${(nps / 1_000_000).toFixed(1)}M nps`;
    if (nps >= 1_000) return `${(nps / 1_000).toFixed(0)}k nps`;
    return nps > 0 ? `${nps} nps` : '';
  });

  engineEval = computed(() => {
    const lines = this.pvLines();
    return lines.length > 0 ? lines[0].eval : null;
  });

  constructor() {
    effect(() => {
      const active = this.isEngineActive();
      const fen = this.currentFen();
      const isBrowser = isPlatformBrowser(this.platformId);

      console.log('[Tactics Component] Engine Effect triggered:', { active, fen, isBrowser });

      if (isBrowser) {
        if (active && fen) {
          this.engineService.startAnalysis(fen);
        } else {
          this.engineService.stop();
        }
      }
    });
  }

  currentUser = this.userService.currentUser;
  puzzleHistory = signal<PuzzleAttempt[]>([]);
  recentPuzzleHistory = computed(() => [...this.puzzleHistory()].reverse().slice(0, 5));

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
  pgnMoves = signal<string[]>([]);
  currentPly = signal(0);
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  fenError = signal<string | null>(null);
  puzzleStartPly = signal(0);
  isMobile = signal(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

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
    this.engineService.terminate();
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
    this.pgnMoves.set([]);
    this.currentPly.set(0);
    this.isEngineActive.set(false);
    this.fenError.set(null);

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
        this.puzzleStartPly.set(getPlyFromFen(res.data.fen));
        this.currentPly.set(this.puzzleStartPly());
        this.isLoading.set(false);
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

    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    try {
      this.chess.load(puzzle.fen);
      const solutionMoves = puzzle.moves.split(' ');
      if (solutionMoves.length > 0) {
        const moveResult = this.chess.move(this.parseUciMove(solutionMoves[0]));
        if (moveResult) {
          this.pgnMoves.set([moveResult.san]);
          this.currentFen.set(this.chess.fen());
        }
      }
    } catch (e) {
      DevLogger.warn('[Tactics] Failed to reset to initial puzzle state:', e);
    }

    this.currentPly.set(this.puzzleStartPly() + this.pgnMoves().length);
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
      const activePlyIndex = this.currentPly() - this.puzzleStartPly();
      const truncatedMoves = moves.slice(0, activePlyIndex);
      if (truncatedMoves.length > 0 && truncatedMoves[truncatedMoves.length - 1] === san) return truncatedMoves;
      return [...truncatedMoves, san];
    });

    if (this.boardComponent) {
      this.boardComponent.setGameMoves(this.pgnMoves());
    }
    this.currentPly.set(this.puzzleStartPly() + this.pgnMoves().length);

    // Update internal chess state and FEN
    try {
      const puzzle = this.currentPuzzle();
      if (puzzle) {
        this.chess.load(puzzle.fen);
        for (const m of this.pgnMoves()) {
          this.chess.move(m);
        }
        this.currentFen.set(this.chess.fen());
      }
    } catch (e: any) {
      DevLogger.warn('[Tactics] Could not update FEN for move:', san, e);
      this.fenError.set(e.message || String(e));
    }
  }

  revealSolution() {
    this.hasRevealedSolution.set(true);
    if (this.boardComponent) {
      this.boardComponent.revealSolution();
    }
  }

  goToMove(ply: number) {
    if (!this.boardComponent) return;

    const startPly = this.puzzleStartPly();
    const relativePly = ply - startPly;

    if (relativePly < 0 || relativePly > this.pgnMoves().length) return;

    if (relativePly === this.pgnMoves().length && this.status() === 'playing') {
      this.boardComponent.exitGameMode();
      this.currentPly.set(ply);
      return;
    }

    this.boardComponent.setGameModeAtMove(this.pgnMoves(), relativePly);
    this.currentPly.set(ply);

    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    this.chess.load(puzzle.fen);
    const moves = this.pgnMoves();
    try {
      for (let i = 0; i < relativePly; i++) {
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
    } catch (e: any) {
      DevLogger.warn('[Tactics] Failed to set chess state for ply:', ply, e);
      this.fenError.set(e.message || String(e));
    }
  }
}


