import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ChangeDetectionStrategy, PLATFORM_ID, NgZone, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TacticsService, Puzzle, WoodpeckerSession, WoodpeckerCycle } from '../../services/tactics.service';
import { EngineService } from '../../../../core/services/engine.service';
import { Chess } from 'chess.js';
import { TacticsBoardComponent, MoveNotationComponent } from '@shared/chess';
import { DevLogger } from '../../../../core/utils/dev-logger';
import { getPlyFromFen } from '../../../../core/utils/chess-tree.utils';
import { WoodpeckerExplanationModalComponent } from '../explanation-modal/woodpecker-explanation-modal.component';
import { StudyAnalysisComponent } from '../../../study/study-analysis/study-analysis.component';

@Component({
  selector: 'app-woodpecker-solve',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TacticsBoardComponent,
    MoveNotationComponent,
    StudyAnalysisComponent,
    WoodpeckerExplanationModalComponent,
  ],
  templateUrl: './woodpecker-solve.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'absolute inset-0 overflow-y-auto lg:overflow-hidden',
  },
})
export class WoodpeckerSolveComponent implements OnInit, OnDestroy {
  private tacticsService = inject(TacticsService);
  engineService = inject(EngineService);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private chess = new Chess();
  protected Math = Math;

  @ViewChild(TacticsBoardComponent) boardComponent!: TacticsBoardComponent;

  sessionId = signal<number | null>(null);
  session = signal<WoodpeckerSession | null>(null);
  currentCycle = signal<WoodpeckerCycle | null>(null);
  currentPuzzle = signal<Puzzle | null>(null);
  nextPuzzlePending = signal<Puzzle | null>(null);

  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  status = signal<'playing' | 'success' | 'failed'>('playing');
  userColor = signal<'white' | 'black'>('white');
  currentFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  // Move notation signals
  pgnMoves = signal<string[]>([]);
  currentPly = signal<number>(0);
  puzzleStartPly = signal<number>(0);

  // Engine analysis & review properties
  isEngineActive = signal<boolean>(false);
  retryMode = signal<boolean>(false);
  exploreMode = signal<boolean>(false);
  fenError = signal<string | null>(null);

  isEngineError = this.engineService.isError;
  pvLines = this.engineService.pvLines;

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

  engineEval = computed(() => {
    const lines = this.pvLines();
    return lines.length > 0 ? lines[0].eval : null;
  });

  // Timers
  cycleTimeElapsed = signal<number>(0);
  puzzleTimeElapsed = signal<number>(0);
  private timerInterval: any;

  // Cycle completion state
  showCompletionOverlay = signal<boolean>(false);
  completedCycleStats = signal<{
    cycleNumber: number;
    accuracy: number;
    totalTime: number;
    totalCorrect: number;
    totalPuzzles: number;
  } | null>(null);
  cycleCompletionPending = signal<{session: WoodpeckerSession, currentCycle: WoodpeckerCycle | null, stats: any} | null>(null);

  constructor() {
    effect(() => {
      const active = this.isEngineActive();
      const fen = this.currentFen();
      const isBrowser = isPlatformBrowser(this.platformId);

      if (isBrowser) {
        if (active && fen) {
          this.engineService.startAnalysis(fen);
        } else {
          this.engineService.stop();
        }
      }
    });
  }

  showExplanation = signal<boolean>(false);

  toggleExplanation() {
    this.showExplanation.update(v => !v);
  }

  isFinished = computed(() => this.session()?.status === 'completed');

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.sessionId.set(Number(id));
          this.loadSessionState();
        } else {
          this.hasError.set(true);
        }
      });
    }
  }

  ngOnDestroy() {
    this.stopTimer();
    this.engineService.stop();
  }

  loadSessionState() {
    const id = this.sessionId();
    if (!id) return;

    this.isLoading.set(true);
    this.hasError.set(false);

    this.tacticsService.getWoodpeckerSession(id).subscribe({
      next: (res) => {
        this.session.set(res.session);
        this.currentCycle.set(res.current_cycle);

        if (res.session.status === 'completed') {
          this.isLoading.set(false);
          return;
        }

        if (res.current_cycle) {
          this.cycleTimeElapsed.set(res.current_cycle.total_time_seconds);
          this.puzzleTimeElapsed.set(0);
          this.startTimer();
        }

        if (res.current_puzzle) {
          this.setupPuzzle(res.current_puzzle);
        } else if (res.session.status === 'active' && !res.current_puzzle) {
          // Fallback if index reached end but cycle status wasn't completed in DB
          this.isLoading.set(false);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        DevLogger.error('[Woodpecker] Failed to load session', err);
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
  }

  setupPuzzle(puzzle: Puzzle) {
    this.isEngineActive.set(false);
    this.engineService.stop();
    this.fenError.set(null);
    this.retryMode.set(false);
    this.exploreMode.set(false);

    this.status.set('playing');
    this.puzzleTimeElapsed.set(0);
    this.nextPuzzlePending.set(null);
    this.pgnMoves.set([]);

    try {
      this.chess.load(puzzle.fen);
      this.currentFen.set(puzzle.fen);
    } catch (e) {
      DevLogger.warn('[Woodpecker] Failed to load puzzle FEN:', e);
    }

    this.currentPuzzle.set(puzzle);
    this.puzzleStartPly.set(getPlyFromFen(puzzle.fen));
    this.currentPly.set(this.puzzleStartPly());
    this.isLoading.set(false);
  }

  // Timer utilities
  startTimer() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopTimer();
    this.ngZone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => {
        this.cycleTimeElapsed.update(t => t + 1);
        this.puzzleTimeElapsed.update(t => t + 1);
      }, 1000);
    });
  }

  stopTimer() {
    if (this.timerInterval && isPlatformBrowser(this.platformId)) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  onPuzzleSolved() {
    this.status.set('success');

    if (this.retryMode()) {
      this.retryMode.set(false);
      this.exploreMode.set(true);
      return;
    }

    this.exploreMode.set(true);
    this.submitAttempt(true);
  }

  onPuzzleFailed() {
    this.status.set('failed');

    if (this.retryMode()) {
      this.resetToInitialPuzzleState();
      return;
    }

    this.retryMode.set(true);
    this.submitAttempt(false);
    this.resetToInitialPuzzleState();
  }

  onWrongMove() {
    this.status.set('failed');

    if (this.retryMode()) {
      this.resetToInitialPuzzleState();
      return;
    }

    this.retryMode.set(true);
    this.submitAttempt(false);
    this.resetToInitialPuzzleState();
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
      DevLogger.warn('[Woodpecker] Failed to reset to initial puzzle state:', e);
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
      DevLogger.warn('[Woodpecker] Could not play move:', san, e);
      this.fenError.set(e.message || String(e));
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
      DevLogger.warn('[Woodpecker] Failed to set chess state for ply:', ply, e);
    }
  }

  onUserColorChange(color: 'white' | 'black') {
    this.userColor.set(color);
  }

  submitAttempt(success: boolean) {
    const id = this.sessionId();
    const puzzle = this.currentPuzzle();
    if (!id || !puzzle) return;

    this.stopTimer();

    const timeSpent = this.puzzleTimeElapsed();
    const moves = this.chess.history().join(' ');

    this.tacticsService.submitWoodpeckerSolve(id, success, timeSpent, moves).subscribe({
      next: (res) => {
        if (res.cycle_completed) {
          // Fetch the completed cycle number
          const completedNum = res.session.current_cycle_number === 1 && res.session.status === 'completed'
            ? 4
            : res.session.current_cycle_number - 1;

          const completedCycle = res.session.cycles.find(c => c.cycle_number === completedNum);
          
          let stats = null;
          if (completedCycle) {
            stats = {
              cycleNumber: completedNum,
              accuracy: Math.round((completedCycle.total_correct / completedCycle.total_solved) * 100),
              totalTime: completedCycle.total_time_seconds,
              totalCorrect: completedCycle.total_correct,
              totalPuzzles: completedCycle.total_solved
            };
          }

          this.cycleCompletionPending.set({
            session: res.session,
            currentCycle: res.current_cycle,
            stats: stats
          });
        } else {
          // Keep updated session and cycle data
          this.session.set(res.session);
          this.currentCycle.set(res.current_cycle);

          // If not completed, store next puzzle as pending so user can click next
          if (res.current_puzzle) {
            this.nextPuzzlePending.set(res.current_puzzle);
          }
        }
      },
      error: (err) => {
        DevLogger.error('[Woodpecker] Failed to submit solve', err);
        this.startTimer(); // Restart on error
      }
    });
  }

  nextPuzzle() {
    const completionPending = this.cycleCompletionPending();
    if (completionPending) {
      this.session.set(completionPending.session);
      this.currentCycle.set(completionPending.currentCycle);
      
      if (completionPending.stats) {
        this.completedCycleStats.set(completionPending.stats);
      }
      
      this.showCompletionOverlay.set(true);
      this.cycleCompletionPending.set(null);
      return;
    }

    // This is called when user made a mistake and finally clicks 'Next'
    const pending = this.nextPuzzlePending();
    if (pending) {
      this.setupPuzzle(pending);
      this.startTimer();
      return;
    }

    const id = this.sessionId();
    if (!id) return;

    this.isLoading.set(true);
    this.tacticsService.getWoodpeckerSession(id).subscribe({
      next: (res) => {
        this.session.set(res.session);
        this.currentCycle.set(res.current_cycle);

        if (res.session.status === 'completed') {
          this.isLoading.set(false);
          return;
        }

        if (res.current_puzzle) {
          this.setupPuzzle(res.current_puzzle);
          this.startTimer();
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  startNextCycle() {
    this.showCompletionOverlay.set(false);
    this.completedCycleStats.set(null);

    const activeCycle = this.currentCycle();
    if (activeCycle) {
      this.cycleTimeElapsed.set(activeCycle.total_time_seconds);
      this.puzzleTimeElapsed.set(0);
      this.startTimer();
    }

    const id = this.sessionId();
    if (id) {
      this.isLoading.set(true);
      this.tacticsService.getWoodpeckerSession(id).subscribe({
        next: (res) => {
          if (res.current_puzzle) {
            this.setupPuzzle(res.current_puzzle);
          } else {
            this.isLoading.set(false);
          }
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    }
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
}
