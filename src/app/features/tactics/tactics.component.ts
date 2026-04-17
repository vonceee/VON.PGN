import {
  Component,
  ViewChild,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TacticsService, Puzzle, SolveResponse } from '../../core/services/tactics.service';
import { GameService } from '../../core/services/game.service';
import { UserService } from '../../core/services/user.service';
import { MoveNotationComponent  } from '@shared/chess';
import { TacticsBoardComponent  } from '@shared/chess';
import { ServerMaintenanceComponent  } from '@shared/feedback';
import { ButtonComponent  } from '@shared/ui';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [
    TacticsBoardComponent,
    ServerMaintenanceComponent,
    ButtonComponent,
    MoveNotationComponent,
  ],
  templateUrl: './tactics.component.html',
})
export class TacticsComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private gameService = inject(GameService);
  private userService = inject(UserService);
  private platformId = inject(PLATFORM_ID);

  constructor() {}

  currentUser = this.userService.currentUser;

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
  boardSize = signal(400); 

  retryMode = signal(false);
  exploreMode = signal(false);
  isLoadingPgn = signal(false);
  pgnMoves = signal<string[]>([]);
  basePgnMoves = signal<string[]>([]);
  currentPly = signal(0);
  puzzleStartPly = signal(0);
  fullPgnMoves: string[] = [];
  isMobile = signal(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  onBoardSizeChange(event: number) {
    this.boardSize.set(event);
  }

  ngOnInit() {
    if (this.currentUser()) {
      this.userService.loadMyProfile().subscribe(() => {
        this.newStreak.set(this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
      });
    }
    this.loadNextPuzzle();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.isMobile.set(window.innerWidth < 768);
      });
    }
  }

  loadNextPuzzle() {
    this.status.set('playing');
    this.ratingChange.set(null);
    this.isLoading.set(true);
    this.hasError.set(false);
    this.hasRevealedSolution.set(false);
    this.retryMode.set(false);
    this.exploreMode.set(false);
    this.isLoadingPgn.set(true);
    this.pgnMoves.set([]);
    this.currentPly.set(0);

    this.tacticsService.getDailyPuzzle().subscribe({
      next: (res: { data: Puzzle }) => {
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

  private loadGameWithPuzzle(puzzle: Puzzle) {
    if (!puzzle?.game_url) {
      this.isLoadingPgn.set(false);
      return;
    }

    const parsed = this.parseGameUrl(puzzle.game_url);
    if (!parsed.gameId) {
      console.warn('[Tactics] Could not parse gameId from URL:', puzzle.game_url);
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

          if (this.boardComponent) {
            this.boardComponent.setGameMoves(mergedMoves);
          }
          
          this.currentPly.set(mergedMoves.length);
        } else {
          console.warn('[Tactics] PGN fetched but empty');
        }
      },
      error: (err: Error) => {
        console.error('[Tactics] Error fetching PGN:', err);
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
      } else {
        this.tacticsService.solvePuzzle(pId, true).subscribe((res: SolveResponse) => {
          this.ratingChange.set(res.rating_change);
          this.newRating.set(res.new_rating);
          this.newStreak.set(res.new_streak);
          this.userService.loadMyProfile().subscribe();
          this.exploreMode.set(true);
        });
      }
    } else {
      this.exploreMode.set(true);
    }
  }

  onPuzzleFailed() {
    this.status.set('failed');

    if (this.currentUser()) {
      this.newStreak.set(0);

      const pId = this.currentPuzzle()?.id;
      if (!pId) return;

      this.tacticsService.solvePuzzle(pId, false).subscribe((res: any) => {
        this.ratingChange.set(res.rating_change);
        this.newRating.set(res.new_rating);
        this.newStreak.set(res.new_streak);
        this.userService.loadMyProfile().subscribe();
      });
    }
  }

  onWrongMove() {
    this.status.set('failed');

    if (this.currentUser()) {
      this.newStreak.set(0);

      const pId = this.currentPuzzle()?.id;
      if (!pId) return;

      this.tacticsService.solvePuzzle(pId, false).subscribe((res: SolveResponse) => {
        this.ratingChange.set(res.rating_change);
        this.newRating.set(res.new_rating);
        this.newStreak.set(res.new_streak);
        this.userService.loadMyProfile().subscribe();
        this.retryMode.set(true);
        this.pgnMoves.set([...this.basePgnMoves()]);
        this.currentPly.set(this.pgnMoves().length);
      });
    } else {
      this.retryMode.set(true);
      this.pgnMoves.set([...this.basePgnMoves()]);
      this.currentPly.set(this.pgnMoves().length);
    }
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
    const moves: string[] = [];
    
    const jsonMatch = pgn.match(/\{.*"moves"\s*:\s*"([^"]*)"/);
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
    while ((match = moveRegex.exec(pgn)) !== null) {
      if (match[1] && match[1] !== 'e.p.' && match[1] !== 'ep') moves.push(match[1]);
      if (match[2] && match[2] !== 'e.p.' && match[2] !== 'ep') moves.push(match[2]);
    }
    
    this.pgnMoves.set(moves);
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
  }
}


