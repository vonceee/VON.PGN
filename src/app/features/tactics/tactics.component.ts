import {
  Component,
  ViewChild,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TacticsService, Puzzle } from '../../core/services/tactics.service';
import { GameService } from '../../core/services/game.service';
import { UserService } from '../../core/services/user.service';
import { TacticsBoardComponent } from '../../shared/components/tactics-board/tactics-board.component';
import { ServerMaintenanceComponent } from '../../shared/components/server-maintenance/server-maintenance.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [
    CommonModule,
    TacticsBoardComponent,
    ServerMaintenanceComponent,
    ButtonComponent,
    RouterLink,
  ],
  templateUrl: './tactics.component.html',
})
export class TacticsComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private gameService = inject(GameService);
  private userService = inject(UserService);

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
  boardSize = signal(this.loadBoardSize());

  retryMode = signal(false);
  exploreMode = signal(false);
  isLoadingPgn = signal(false);
  pgnMoves = signal<string[]>([]);
  currentPgnMoveIndex = signal(-1);
  puzzleStartPly = signal(-1);
  fullPgnMoves: string[] = [];

  moveRounds = computed(() => {
    const moves = this.pgnMoves();
    const rounds = [];
    for (let i = 0; i < moves.length; i += 2) {
      rounds.push({
        num: Math.floor(i / 2) + 1,
        white: moves[i] || '',
        black: moves[i + 1] || null,
        whiteIndex: i,
        blackIndex: i + 1
      });
    }
    return rounds;
  });

  private resizeStartX = 0;
  private resizeStartSize = 0;
  private isResizing = false;

  private loadBoardSize(): number {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('boardSize');
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= 280 && size <= 560) return size;
      }
    }
    return 560;
  }

  private saveBoardSize(size: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardSize', size.toString());
    }
  }

  onBoardSizeChange(event: number) {
    this.boardSize.set(event);
    this.saveBoardSize(event);
  }

  startTacticsResize(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isResizing = true;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    this.resizeStartX = clientX;
    this.resizeStartSize = this.boardSize();
    document.addEventListener('mousemove', this.onTacticsResize);
    document.addEventListener('mouseup', this.stopTacticsResize);
    document.addEventListener('touchmove', this.onTacticsTouchResize);
    document.addEventListener('touchend', this.stopTacticsResize);
  }

  private onTacticsResize = (event: MouseEvent): void => {
    if (!this.isResizing) return;
    const delta = event.clientX - this.resizeStartX;
    const newSize = Math.min(560, Math.max(280, this.resizeStartSize + delta));
    this.boardSize.set(newSize);
  };

  private onTacticsTouchResize = (event: TouchEvent): void => {
    if (!this.isResizing || !event.touches.length) return;
    const delta = event.touches[0].clientX - this.resizeStartX;
    const newSize = Math.min(560, Math.max(280, this.resizeStartSize + delta));
    this.boardSize.set(newSize);
  };

  private stopTacticsResize = (): void => {
    this.isResizing = false;
    this.saveBoardSize(this.boardSize());
    document.removeEventListener('mousemove', this.onTacticsResize);
    document.removeEventListener('mouseup', this.stopTacticsResize);
    document.removeEventListener('touchmove', this.onTacticsTouchResize);
    document.removeEventListener('touchend', this.stopTacticsResize);
  };

  ngOnInit() {
    if (this.currentUser()) {
      this.userService.loadMyProfile().subscribe(() => {
        this.newStreak.set(this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
      });
    }
    this.loadNextPuzzle();
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
    this.currentPgnMoveIndex.set(-1);

    this.tacticsService.getDailyPuzzle().subscribe({
      next: (res) => {
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
      next: (pgn) => {
        this.isLoadingPgn.set(false);
        if (pgn && pgn.length > 0) {
          this.parsePgn(pgn);
          this.fullPgnMoves = [...this.pgnMoves()];

          if (parsed.ply > 0 && this.fullPgnMoves.length > parsed.ply) {
            this.pgnMoves.set(this.fullPgnMoves.slice(0, parsed.ply));
          }

          if (this.boardComponent) {
            this.boardComponent.setGameMoves(this.pgnMoves());
          }
        } else {
          console.warn('[Tactics] PGN fetched but empty');
        }
      },
      error: (err) => {
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
    // Handle both formats: lichess.org/gameId/perspective#ply AND lichess.org/gameId#ply
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

  private goToPly(ply: number) {
    if (!this.boardComponent || ply <= 0) return;
    const current = this.currentPgnMoveIndex();
    const target = ply - 1;
    
    if (target > current) {
      const steps = target - current;
      for (let i = 0; i < steps; i++) {
        this.boardComponent.nextGameMove();
      }
      this.currentPgnMoveIndex.set(target);
    }
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
        this.tacticsService.solvePuzzle(pId, true).subscribe((res) => {
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

      this.tacticsService.solvePuzzle(pId, false).subscribe((res) => {
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

      this.tacticsService.solvePuzzle(pId, false).subscribe((res) => {
        this.ratingChange.set(res.rating_change);
        this.newRating.set(res.new_rating);
        this.newStreak.set(res.new_streak);
        this.userService.loadMyProfile().subscribe();
        this.retryMode.set(true);
      });
    } else {
      this.retryMode.set(true);
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

  loadGameReview() {
    if (this.fullPgnMoves.length > 0 && this.boardComponent) {
      this.pgnMoves.set(this.fullPgnMoves);
      
      const solvedIndex = this.puzzleStartPly() + this.boardComponent.currentMoveIndex - 1;
      this.currentPgnMoveIndex.set(solvedIndex);
      
      this.boardComponent.setGameModeAtMove(this.fullPgnMoves, solvedIndex);
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
          const cleanMove = part.replace(/[#+?=!]+$/, '');
          if (cleanMove.length >= 2 && cleanMove.length <= 7) {
            moves.push(cleanMove);
          }
        }
      }
      this.pgnMoves.set(moves);
      console.log('[Tactics] Parsed moves (JSON):', moves.length);
      return;
    }
    
    const moveRegex = /\d+\.\s*([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?|[O-o](?:-[O-o])?|e\.?p\.?)\s*([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?|e\.?p\.?)?/g;
    
    let match;
    while ((match = moveRegex.exec(pgn)) !== null) {
      if (match[1] && match[1] !== 'e.p.' && match[1] !== 'ep') moves.push(match[1]);
      if (match[2] && match[2] !== 'e.p.' && match[2] !== 'ep') moves.push(match[2]);
    }
    
    this.pgnMoves.set(moves);
    console.log('[Tactics] Parsed moves (regex):', moves.length, moves.slice(0, 5));
  }

  previousPgnMove() {
    if (!this.boardComponent) return;
    
    if (this.currentPgnMoveIndex() > 0) {
      this.currentPgnMoveIndex.update(i => i - 1);
      this.boardComponent.previousGameMove();
    } else if (this.currentPgnMoveIndex() === 0) {
      this.currentPgnMoveIndex.set(-1);
      this.boardComponent.resetToGameStart();
    }
  }

  nextPgnMove() {
    if (!this.boardComponent) return;
    
    if (this.currentPgnMoveIndex() < this.pgnMoves().length - 1) {
      this.currentPgnMoveIndex.update(i => i + 1);
      this.boardComponent.nextGameMove();
    }
  }

  goToPgnEnd() {
    if (!this.boardComponent || this.pgnMoves().length === 0) return;
    this.goToMove(this.pgnMoves().length - 1);
  }

  resetToGameStart() {
    if (this.boardComponent) {
      this.currentPgnMoveIndex.set(-1);
      this.boardComponent.resetToGameStart();
    }
  }

  goToMove(index: number) {
    if (!this.boardComponent) return;
    
    const currentIdx = this.currentPgnMoveIndex();
    
    if (index > currentIdx) {
      const steps = index - currentIdx;
      for (let i = 0; i < steps; i++) {
        this.boardComponent.nextGameMove();
      }
      this.currentPgnMoveIndex.set(index);
    } else if (index < currentIdx) {
      const steps = currentIdx - index;
      for (let i = 0; i < steps; i++) {
        this.boardComponent.previousGameMove();
      }
      this.currentPgnMoveIndex.set(index);
    }
  }

  formatMove(move: string): string {
    if (!move) return '';
    return move
      .replace(/K/g, '♔')
      .replace(/Q/g, '♕')
      .replace(/R/g, '♖')
      .replace(/B/g, '♗')
      .replace(/N/g, '♘')
      .replace(/P/g, ''); // Pawns usually don't have a symbol in SAN
  }
}

