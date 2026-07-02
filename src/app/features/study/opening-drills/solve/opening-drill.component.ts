import { Component, inject, signal, computed, ViewChild, OnInit, OnDestroy, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { StudyService } from '../../../../core/services/study.service';
import { AudioService } from '../../../../core/services/audio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { Study, StudyChapter, MoveNode } from '../../../../core/models/study.model';
import { buildTreeFromMoves } from '../../../../core/utils/chess-tree.utils';
import { ChessBoardComponent } from '@shared/chess';
import { ButtonComponent } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroInformationCircle } from '@ng-icons/heroicons/outline';

export interface MovePath {
  id: string;
  moves: MoveNode[];
}

export interface PracticeMistake {
  id: string;
  chapterIndex: number;
  chapterName: string;
  pathIndex: number;
  moveIndex: number;
  playedMove: string;
  correctMove: string;
  preMistakeFen: string;
  movesBefore: string[];
}

@Component({
  selector: 'app-opening-drill',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChessBoardComponent, ButtonComponent, NgIconComponent],
  providers: [provideIcons({ heroInformationCircle })],
  templateUrl: './opening-drill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.absolute]': "viewState() === 'active'",
    '[class.inset-0]': "viewState() === 'active'",
    '[class.overflow-hidden]': "viewState() === 'active'",
    '[class.w-full]': 'true',
    '[class.min-h-full]': 'true',
    '[class.block]': 'true',
  },
})
export class OpeningDrillComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private studyService = inject(StudyService);
  private audioService = inject(AudioService);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;
  private platformId = inject(PLATFORM_ID);

  @ViewChild('board') boardComponent!: ChessBoardComponent;

  // View state: 'active' | 'success'
  viewState = signal<'active' | 'success'>('active');
  isLoading = signal(false);
  isRetryMode = signal(false);

  // Active training state
  selectedStudy = signal<Study | null>(null);
  chapters = signal<StudyChapter[]>([]);
  currentChapterIndex = signal(0);
  currentChapter = computed(() => {
    const list = this.chapters();
    const idx = this.currentChapterIndex();
    return list.length > 0 && idx < list.length ? list[idx] : null;
  });

  // Paths drilling
  drillPaths = signal<MovePath[]>([]);
  currentPathIndex = signal(0);
  currentPath = computed(() => {
    const paths = this.drillPaths();
    const idx = this.currentPathIndex();
    return paths.length > 0 && idx < paths.length ? paths[idx] : null;
  });

  // Move tracking inside the path
  currentIndex = signal(0);
  boardFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  boardOrientation = signal<'white' | 'black'>('white');
  boardInteractive = signal(true);
  shakeBoard = signal(false);

  // Status updates
  drillStatusMessage = signal('Get ready to play!');
  drillStatusClass = signal<'info' | 'success' | 'error'>('info');

  // Interactive logs / list of moves played in current path
  movesDrilled = signal<{ san: string; playedBy: 'student' | 'opponent'; correct: boolean }[]>([]);

  // Mistake tracker
  lastMistake = signal<{ played: string; correct: string; studyId: number; chapterId: number; chapterName: string } | null>(null);
  drillMistakes = signal<PracticeMistake[]>([]);
  showExplanation = signal(false);
  walkthroughStep = signal(2);

  nextStep() {
    const current = this.walkthroughStep();
    if (current < 7) {
      this.walkthroughStep.set(current + 1);
    } else {
      this.showExplanation.set(false);
      this.walkthroughStep.set(0);
    }
  }

  prevStep() {
    const current = this.walkthroughStep();
    if (current > 1) {
      this.walkthroughStep.set(current - 1);
    }
  }

  // Statistics
  attemptsCount = signal(0);
  correctCount = signal(0);
  drillAccuracy = computed(() => {
    const att = this.attemptsCount();
    if (att === 0) return 100;
    return Math.round((this.correctCount() / att) * 100);
  });

  // Opponent thinking timer
  private opponentTimer: any;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.route.paramMap.subscribe(params => {
        const idStr = params.get('id');
        if (idStr) {
          const studyId = parseInt(idStr, 10);
          this.loadRepertoire(studyId);
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.opponentTimer) clearTimeout(this.opponentTimer);
  }

  loadRepertoire(studyId: number) {
    this.isLoading.set(true);
    this.http.get<{ data: Study }>(`${this.apiUrl}/studies/${studyId}`).subscribe({
      next: (res) => {
        const fullStudy = res.data;
        this.selectedStudy.set(fullStudy);

        const chaps = fullStudy.chapters || [];
        if (chaps.length === 0) {
          this.toastService.show('This study has no lines/chapters. Please create chapters first.', 'error');
          this.router.navigate(['/study/drills']);
          this.isLoading.set(false);
          return;
        }

        // Initialize drilling
        this.chapters.set(chaps);
        this.currentChapterIndex.set(0);
        this.attemptsCount.set(0);
        this.correctCount.set(0);
        this.drillMistakes.set([]);

        this.startChapterDrill();
        this.viewState.set('active');
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch study details:', err);
        this.toastService.show('Failed to load repertoire details.', 'error');
        this.router.navigate(['/study/drills']);
        this.isLoading.set(false);
      }
    });
  }

  // ── Step 2: Active Drilling Engine ──────────────────────────
  /**
   * Initializes and compiles the variation drilling parameters for the active repertoire chapter.
   * 
   * WHY: Triggers depth-first search (DFS) path compilation of all branches in the chapter's PGN tree,
   *      calibrates orientation to protect training perspective, and handles empty chapters gracefully.
   * 
   * EXPECTED INPUT/OUTPUT:
   * - Reads active chapter from `currentChapter()` computed signal.
   * - Side-effects: Sets `boardOrientation`, `drillPaths`, and schedules path initiation.
   * 
   * ASSUMPTIONS/EDGE CASES:
   * - Fallback to standard starting FEN if chapter's initial FEN is missing.
   * - If a chapter contains no moves or paths cannot be compiled, invokes `handleEmptyChapter()` to prevent visual freeze.
   */
  startChapterDrill() {
    const chapter = this.currentChapter();
    if (!chapter) {
      this.handleEmptyChapter();
      return;
    }

    console.log('[OpeningDrills] Starting Chapter Drill:', chapter.name);
    console.log('[OpeningDrills] Chapter Details - Initial FEN:', chapter.initial_fen, 'Current FEN:', chapter.current_fen);

    // CRITICAL: Auto-detects and locks board orientation strictly from chapter settings/PGN tags to preserve active drilling turn coordination and prevent user from playing opponent moves.
    let orientation: 'white' | 'black' = 'white';
    const pgnOrientation = chapter.pgn_tags?.['Orientation'] || chapter.pgn_tags?.['orientation'];
    if (pgnOrientation) {
      orientation = pgnOrientation.toLowerCase() === 'black' ? 'black' : 'white';
    } else {
      orientation = (chapter.orientation === 'black') ? 'black' : 'white';
    }
    this.boardOrientation.set(orientation);
    console.log('[OpeningDrills] Board orientation set to:', orientation);

    // Extract all paths using DFS variation recursive path compiler
    const rawMoves = chapter.moves;
    const initialFen = chapter.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    console.log('[OpeningDrills] Raw moves from database:', rawMoves);
    const parsedTree = buildTreeFromMoves(rawMoves, initialFen);
    console.log('[OpeningDrills] Parsed Moves Tree:', parsedTree);

    if (parsedTree.length === 0) {
      this.toastService.show(`Chapter "${chapter.name}" has no moves to drill yet.`, 'error');
      this.drillPaths.set([]);
      this.drillStatusMessage.set('No moves in this variation.');
      this.drillStatusClass.set('info');
      this.handleEmptyChapter();
      return;
    }

    const paths = this.compilePaths(parsedTree);
    console.log('[OpeningDrills] Compiled Paths:', paths);
    this.drillPaths.set(paths);
    this.currentPathIndex.set(0);

    if (paths.length === 0) {
      this.toastService.show(`Chapter "${chapter.name}" has no valid paths to drill.`, 'error');
      this.drillStatusMessage.set('Failed to compile variation branches.');
      this.handleEmptyChapter();
      return;
    }

    this.startPathDrill();
  }

  /**
   * Progresses the repertoire solve screen to the next available chapter, or launches the success view.
   * 
   * WHY: Prevents user blockage (stuck state) when encountering chapters without moves/paths.
   * 
   * EXPECTED INPUT/OUTPUT:
   * - Reads index bounds from `currentChapterIndex()` and chapters list.
   * - Side-effects: Increments indices, schedules new drill, or sets `viewState` to success.
   * 
   * ASSUMPTIONS/EDGE CASES:
   * - Uses a deferred `setTimeout` microtask callback to execute `startChapterDrill()` to bypass synchronous recursive stack overflows.
   */
  handleEmptyChapter() {
    const currentChapterIdx = this.currentChapterIndex();
    const chaptersList = this.chapters();

    if (currentChapterIdx + 1 < chaptersList.length) {
      this.currentChapterIndex.set(currentChapterIdx + 1);
      setTimeout(() => this.startChapterDrill(), 0);
    } else {
      // Repertoire finished!
      this.viewState.set('success');
    }
  }

  startPathDrill() {
    if (this.opponentTimer) {
      clearTimeout(this.opponentTimer);
      this.opponentTimer = null;
    }

    const path = this.currentPath();
    const chapter = this.currentChapter();
    if (!path || !chapter) return;

    const initialFen = chapter.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    console.log('[OpeningDrills] Starting Path Drill. Initial FEN to load:', initialFen);
    console.log('[OpeningDrills] Active Path Moves:', path.moves.map(m => m.san));

    this.boardFen.set(initialFen);
    this.currentIndex.set(0);
    this.movesDrilled.set([]);
    this.lastMistake.set(null);

    this.drillStatusMessage.set(`Variation ${this.currentPathIndex() + 1} of ${this.drillPaths().length}`);
    this.drillStatusClass.set('info');

    // Run drill turn controller
    setTimeout(() => this.checkNextTurn(), 300);
  }

  // ── Sequential Tree Path Compiler ──────────────────────────
  private compilePaths(nodes: MoveNode[], currentPath: MoveNode[] = []): MovePath[] {
    const paths: MovePath[] = [];
    const activePath = [...currentPath];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      activePath.push(node);

      // If this node has variations branching off BEFORE this mainline continuation,
      // we must compile each variation branch.
      // Note: The variations branch off from the position BEFORE the current node.
      if (node.variations && node.variations.length > 0) {
        const prefixPath = activePath.slice(0, -1); // path up to parent FEN
        for (const variation of node.variations) {
          paths.push(...this.compilePaths(variation, prefixPath));
        }
      }

      // If we reach the end of this mainline list, it is a complete path
      if (i === nodes.length - 1) {
        paths.push({
          id: activePath.map(n => n.san).join('_') + '_' + Math.random().toString(36).substring(2, 7),
          moves: [...activePath]
        });
      }
    }

    return paths;
  }

  // ── State Machine: Turn Coordinator ────────────────────────
  private getMoveColor(node: MoveNode): 'white' | 'black' {
    if (!node.fen) return 'white';
    const parts = node.fen.split(' ');
    if (parts.length < 2) return 'white';
    const moveColor = parts[1] === 'b' ? 'white' : 'black';
    console.log(`[OpeningDrills] Move color check for ${node.san}: FEN turn: ${parts[1]} -> played by: ${moveColor}`);
    return moveColor;
  }

  checkNextTurn() {
    const path = this.currentPath();
    if (!path) return;

    const idx = this.currentIndex();
    console.log('[OpeningDrills] checkNextTurn - Current Move Index:', idx, 'Total Path Moves:', path.moves.length);

    if (idx >= path.moves.length) {
      console.log('[OpeningDrills] Path complete reached!');
      // Path complete!
      this.drillStatusMessage.set('Variation completed successfully!');
      this.drillStatusClass.set('success');
      this.audioService.playNotification();

      // Flash board border or show brief overlay, then load next variation path
      setTimeout(() => this.advanceDrill(), 1500);
      return;
    }

    const nextMove = path.moves[idx];
    const studentColor = this.boardOrientation().toLowerCase();
    const moveColor = this.getMoveColor(nextMove);

    console.log('[OpeningDrills] Next Target Move:', nextMove.san, 'Move Color:', moveColor, 'Student Color:', studentColor);

    if (moveColor === studentColor) {
      // Student's turn
      console.log('[OpeningDrills] Pausing for Student move input...');
      this.boardInteractive.set(true);
      this.drillStatusMessage.set(`Your turn! Play the correct move: ${studentColor === 'white' ? 'White' : 'Black'} to play.`);
      this.drillStatusClass.set('info');
    } else {
      // Opponent's turn (plays automatically)
      console.log('[OpeningDrills] Executing opponent automated move...');
      this.boardInteractive.set(false);
      this.drillStatusMessage.set('Opponent is thinking...');
      this.drillStatusClass.set('info');

      // Play move after 600ms delay
      this.opponentTimer = setTimeout(() => {
        console.log('[OpeningDrills] Opponent plays move:', nextMove.san, 'FEN:', nextMove.fen);
        this.boardFen.set(nextMove.fen);
        this.audioService.playMoveSound(nextMove.san);

        // Log opponent's move
        this.movesDrilled.update(list => [...list, { san: nextMove.san, playedBy: 'opponent', correct: true }]);

        this.currentIndex.set(idx + 1);
        this.checkNextTurn();
      }, 600);
    }
  }

  // ── Move Verification on Board Input ───────────────────────
  /**
   * Verifies a student's chess move submission against the active compiled path node.
   * 
   * WHY: Orchestrates active feedback, logs accuracy metrics, registers mistakes,
   *      and pops invalid chess.js entries immediately to preserve legal moves highlighting.
   * 
   * @param  event  Object containing chess.js transition data: { move: Move, fen: string }
   * 
   * ASSUMPTIONS/EDGE CASES:
   * - Fallback to chapter initial FEN if mistake occurs on the first move (idx === 0).
   * - TRADEOFF: Invokes `boardComponent.undoMove()` instead of visually resetting FEN.
   *   This removes the invalid entry from the chess.js engine, preventing illegal destination crashes.
   */
  onStudentMove(event: { move: any; fen: string }) {
    this.showExplanation.set(false);
    this.walkthroughStep.set(0);
    const path = this.currentPath();
    if (!path) return;

    const idx = this.currentIndex();
    const targetMove = path.moves[idx];

    this.attemptsCount.update(c => c + 1);

    const playedSan = event.move.san;
    const playedUci = event.move.from + event.move.to;
    const targetSan = targetMove.san;
    const targetUci = targetMove.uci;

    const isCorrect = (playedSan.toLowerCase() === targetSan.toLowerCase()) ||
      (playedUci.toLowerCase() === targetUci.toLowerCase());

    if (isCorrect) {
      // Correct Move!
      this.correctCount.update(c => c + 1);
      this.audioService.playMoveSound(playedSan);
      this.lastMistake.set(null);

      // Update board FEN explicitly to sync
      this.boardFen.set(event.fen);

      this.movesDrilled.update(list => [...list, { san: playedSan, playedBy: 'student', correct: true }]);
      this.currentIndex.set(idx + 1);

      this.drillStatusMessage.set('Correct! Keep going.');
      this.drillStatusClass.set('success');

      this.checkNextTurn();
    } else {
      // Incorrect Move (Deviation)!
      this.audioService.playNotification(); // Warn/notify sound

      // Log incorrect attempt
      this.movesDrilled.update(list => [...list, { san: playedSan, playedBy: 'student', correct: false }]);

      this.drillStatusMessage.set(`Incorrect move ${playedSan}! Try again.`);
      this.drillStatusClass.set('error');

      const study = this.selectedStudy();
      const chapter = this.currentChapter();

      const preMistakeFen = idx === 0 ? (chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        : path.moves[idx - 1].fen;

      const movesBefore = path.moves.slice(0, idx).map(m => m.san);

      if (study && chapter) {
        this.lastMistake.set({
          played: playedSan,
          correct: targetSan,
          studyId: study.id,
          chapterId: chapter.id,
          chapterName: chapter.name
        });

        // Save mistake for success screen summary review
        const mistakeId = `${chapter.id}_${this.currentPathIndex()}_${idx}`;
        const alreadyExists = this.drillMistakes().some(m => m.id === mistakeId);
        if (!alreadyExists) {
          this.drillMistakes.update(list => [
            ...list,
            {
              id: mistakeId,
              chapterIndex: this.currentChapterIndex(),
              chapterName: chapter.name,
              pathIndex: this.currentPathIndex(),
              moveIndex: idx,
              playedMove: playedSan,
              correctMove: targetSan,
              preMistakeFen,
              movesBefore
            }
          ]);
        }
      }

      // TRADEOFF: Calls component-level undoMove() instead of visually re-setting FEN to pop invalid chess.js state entries, keeping board drag interactive.
      if (this.boardComponent) {
        this.boardComponent.undoMove();
      }
    }
  }

  // ── Step 4: Looping & Progression ───────────────────────────
  /**
   * Evaluates progression of variations, moving from branch to branch and chapter to chapter.
   * 
   * WHY: Coordinates the macro-level transition machine between lines and chapters.
   *      Supports auto-redirection back to the summary screen if completing a variation in retry mode.
   * 
   * ASSUMPTIONS/EDGE CASES:
   * - AI-GENERATED WORKAROUND: Hijacks standard path incrementation when `isRetryMode()` is enabled
   *   to return the user back to their summary overview upon successful resolution of the weak spot.
   */
  advanceDrill() {
    if (this.isRetryMode()) {
      this.isRetryMode.set(false);
      this.viewState.set('success');
      return;
    }

    const paths = this.drillPaths();
    const currentIdx = this.currentPathIndex();

    if (currentIdx + 1 < paths.length) {
      // Move to next branch in active chapter
      this.currentPathIndex.set(currentIdx + 1);
      this.startPathDrill();
    } else {
      // Chapter finished!
      const currentChapterIdx = this.currentChapterIndex();
      const chaptersList = this.chapters();

      if (currentChapterIdx + 1 < chaptersList.length) {
        this.currentChapterIndex.set(currentChapterIdx + 1);
        this.startChapterDrill();
      } else {
        // Repertoire finished!
        this.viewState.set('success');
      }
    }
  }

  // ── Reset Drilling / Back Action ────────────────────────────
  quitActiveDrill() {
    if (this.opponentTimer) clearTimeout(this.opponentTimer);
    this.router.navigate(['/study/drills']);
  }

  restartRepertoire() {
    this.attemptsCount.set(0);
    this.correctCount.set(0);
    this.currentChapterIndex.set(0);
    this.drillMistakes.set([]);
    this.startChapterDrill();
    this.viewState.set('active');
  }

  /**
   * Configures active training signals to focus on a previously played mistake position.
   * 
   * WHY: Builds context around a target weak spot by loading FEN right before the mistake,
   *      restoring path indices, auto-detecting orientation, and loading all prefix moves into the logs.
   * 
   * @param  mistake  The structured `PracticeMistake` record containing historical coordinates.
   * 
   * ASSUMPTIONS/EDGE CASES:
   * - Orientation tags are parsed dynamically to maintain turn constraints.
   * - Pre-populates the move log context so the visual UI lists the moves leading up to the mistake FEN.
   */
  retryMistakePosition(mistake: PracticeMistake) {
    // Clear last mistake panel
    this.lastMistake.set(null);

    // AI-GENERATED WORKAROUND: Hijacks isRetryMode and active signal coordinates to target an isolated mistake variation.
    this.isRetryMode.set(true);

    // Set active training parameters to point exactly to this mistake's context
    this.currentChapterIndex.set(mistake.chapterIndex);

    // Reset chapter's path and moves tree
    const chapter = this.chapters()[mistake.chapterIndex];
    if (!chapter) return;

    // Auto-detect orientation
    let orientation: 'white' | 'black' = 'white';
    const pgnOrientation = chapter.pgn_tags?.['Orientation'] || chapter.pgn_tags?.['orientation'];
    if (pgnOrientation) {
      orientation = pgnOrientation.toLowerCase() === 'black' ? 'black' : 'white';
    } else {
      orientation = (chapter.orientation === 'black') ? 'black' : 'white';
    }
    this.boardOrientation.set(orientation);

    const rawMoves = chapter.moves;
    const initialFen = chapter.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const parsedTree = buildTreeFromMoves(rawMoves, initialFen);
    const paths = this.compilePaths(parsedTree);
    this.drillPaths.set(paths);

    // Point to the specific path and move index of the mistake
    this.currentPathIndex.set(mistake.pathIndex);
    this.currentIndex.set(mistake.moveIndex);
    this.boardFen.set(mistake.preMistakeFen);

    // Load moves drilled context so far
    const path = paths[mistake.pathIndex];
    const sequence: { san: string; playedBy: 'student' | 'opponent'; correct: boolean }[] = [];
    const studentColor = orientation.toLowerCase();

    for (let i = 0; i < mistake.moveIndex; i++) {
      const moveNode = path.moves[i];
      const moveColor = this.getMoveColor(moveNode);
      sequence.push({
        san: moveNode.san,
        playedBy: moveColor === studentColor ? 'student' : 'opponent',
        correct: true
      });
    }
    this.movesDrilled.set(sequence);

    // Switch view back to active drilling
    this.viewState.set('active');

    // Start opponent thinking timer if it is opponent's turn, otherwise set interactive
    setTimeout(() => this.checkNextTurn(), 300);
  }

  cancelRetry() {
    this.isRetryMode.set(false);
    this.viewState.set('success');
  }
}
