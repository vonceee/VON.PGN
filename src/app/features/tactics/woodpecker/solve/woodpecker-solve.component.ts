import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ChangeDetectionStrategy, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TacticsService, Puzzle, WoodpeckerSession, WoodpeckerCycle } from '../../../../core/services/tactics.service';
import { Chess } from 'chess.js';
import { TacticsBoardComponent } from '@shared/chess';
import { LoadingComponent } from '@shared/feedback';
import { ButtonComponent } from '@shared/ui';
import { DevLogger } from '../../../../core/utils/dev-logger';

@Component({
  selector: 'app-woodpecker-solve',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TacticsBoardComponent,
    LoadingComponent,
    ButtonComponent,
  ],
  templateUrl: './woodpecker-solve.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoodpeckerSolveComponent implements OnInit, OnDestroy {
  private tacticsService = inject(TacticsService);
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

  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  status = signal<'playing' | 'success' | 'failed'>('playing');
  hasRevealedSolution = signal<boolean>(false);
  userColor = signal<'white' | 'black'>('white');
  currentFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

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

  isFinished = computed(() => this.session()?.status === 'completed');

  ngOnInit() {
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

  ngOnDestroy() {
    this.stopTimer();
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
    this.status.set('playing');
    this.hasRevealedSolution.set(false);
    this.puzzleTimeElapsed.set(0);

    try {
      this.chess.load(puzzle.fen);
      this.currentFen.set(puzzle.fen);
    } catch (e) {
      DevLogger.warn('[Woodpecker] Failed to load puzzle FEN:', e);
    }

    this.currentPuzzle.set(puzzle);
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
    this.submitAttempt(true);
  }

  onPuzzleFailed() {
    this.status.set('failed');
    this.submitAttempt(false);
  }

  onWrongMove() {
    this.status.set('failed');
    this.submitAttempt(false);
  }

  onPuzzleMoveMade(san: string) {
    try {
      this.chess.move(san);
      this.currentFen.set(this.chess.fen());
    } catch (e) {
      DevLogger.warn('[Woodpecker] Could not play move:', san, e);
    }
  }

  onUserColorChange(color: 'white' | 'black') {
    this.userColor.set(color);
  }

  revealSolution() {
    this.hasRevealedSolution.set(true);
    if (this.boardComponent) {
      this.boardComponent.revealSolution();
    }
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
        // Keep updated session and cycle data
        this.session.set(res.session);
        this.currentCycle.set(res.current_cycle);

        if (res.cycle_completed) {
          // Fetch the completed cycle number
          const completedNum = res.session.current_cycle_number === 1 && res.session.status === 'completed'
            ? 4 
            : res.session.current_cycle_number - 1;

          const completedCycle = res.session.cycles.find(c => c.cycle_number === completedNum);
          
          if (completedCycle) {
            this.completedCycleStats.set({
              cycleNumber: completedNum,
              accuracy: Math.round((completedCycle.total_correct / completedCycle.total_solved) * 100),
              totalTime: completedCycle.total_time_seconds,
              totalCorrect: completedCycle.total_correct,
              totalPuzzles: completedCycle.total_solved
            });
          }

          this.showCompletionOverlay.set(true);
        } else {
          // If not completed, transition to next puzzle immediately
          if (res.current_puzzle) {
            this.setupPuzzle(res.current_puzzle);
            this.startTimer();
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
    // This is called when user made a mistake and finally clicks 'Next'
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
