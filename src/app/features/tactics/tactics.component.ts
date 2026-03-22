import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  inject,
  NgZone,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TacticsService, Puzzle } from '../../core/services/tactics.service';
import { UserService } from '../../core/services/user.service';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tactics.component.html',
})
export class TacticsComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private userService = inject(UserService);
  private ngZone = inject(NgZone);

  currentUser = this.userService.currentUser;

  @ViewChild('boardRef', { static: true }) boardRef!: ElementRef;

  private board!: Api;
  private chess = new Chess();

  currentPuzzle = signal<Puzzle | null>(null);
  solutionMoves: string[] = [];
  currentMoveIndex = 0;
  isLoading = signal<boolean>(true);
  hasRevealedSolution = signal<boolean>(false);
  userColor = signal<'white' | 'black'>('white');
  status = signal<'playing' | 'success' | 'failed'>('playing');
  ratingChange = signal<number | null>(null);
  newRating = signal<number | null>(null);
  newStreak = signal<number>(0);
  xpEarned = signal<number | null>(null);
  userRating = computed(() => this.userService.currentUser()?.progress?.puzzleRating ?? 1200);
  userStreak = computed(() => this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
  ngOnInit() {
    this.userService.loadMyProfile().subscribe(() => {
      this.newStreak.set(this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
    });
    this.loadNextPuzzle();
  }

  loadNextPuzzle() {
    this.status.set('playing');
    this.ratingChange.set(null);
    this.xpEarned.set(null);
    this.isLoading.set(true);
    this.hasRevealedSolution.set(false);

    this.tacticsService.getDailyPuzzle().subscribe((res) => {
      this.currentPuzzle.set(res.data);
      this.isLoading.set(false);

      const p = this.currentPuzzle();
      if (!p) {
        return;
      }
      this.solutionMoves = p.moves.split(' ');
      this.currentMoveIndex = 0;
      this.initPuzzle();
    });
  }

  initPuzzle() {
    const p = this.currentPuzzle();
    if (!p) return;

    this.chess.load(p.fen);

    const opponentInitialMove = this.solutionMoves[this.currentMoveIndex];
    this.chess.move(this.parseUciMove(opponentInitialMove));
    this.currentMoveIndex++;
    this.userColor.set(this.chess.turn() === 'w' ? 'white' : 'black');

    this.board = Chessground(this.boardRef.nativeElement, {
      fen: this.chess.fen(),
      orientation: this.userColor(),
      turnColor: this.userColor(),
      coordinates: false,
      movable: {
        color: this.userColor(),
        free: false,
        dests: this.calculateDests(),
        events: {
          after: (orig, dest) => {
            this.ngZone.run(() => {
              this.onUserMove(orig, dest);
            });
          },
        },
      },
    });
  }

  onUserMove(orig: any, dest: any) {
    if (this.status() !== 'playing') return;

    const expectedMove = this.solutionMoves[this.currentMoveIndex];
    const userMoveStr = `${orig}${dest}`; // e.g., "e2e4"

    if (expectedMove.startsWith(userMoveStr)) {
      this.chess.move(this.parseUciMove(expectedMove));
      this.currentMoveIndex++;

      this.board.set({
        fen: this.chess.fen(),
        turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
      });

      if (this.currentMoveIndex >= this.solutionMoves.length) {
        this.winPuzzle();
      } else {
        setTimeout(() => {
          this.playOpponentMove();
        }, 500);
      }
    } else {
      this.board.set({
        fen: this.chess.fen(),
        turnColor: this.userColor(),
      });

      this.failPuzzle();
    }
  }

  playOpponentMove() {
    const oppMove = this.solutionMoves[this.currentMoveIndex];
    this.chess.move(this.parseUciMove(oppMove));
    this.currentMoveIndex++;

    this.board.set({
      fen: this.chess.fen(),
      turnColor: this.userColor(),
      movable: { dests: this.calculateDests() },
    });
  }

  winPuzzle() {
    this.status.set('success');
    this.newStreak.update((s) => s + 1);
    this.board.set({ movable: { color: undefined } });

    const pId = this.currentPuzzle()?.id;
    if (!pId) return;

    this.tacticsService.solvePuzzle(pId, true).subscribe((res) => {
      this.ratingChange.set(res.rating_change);
      this.newRating.set(res.new_rating);
      this.newStreak.set(res.new_streak);
      this.xpEarned.set(res.xp_earned);
      this.userService.loadMyProfile().subscribe();
    });
  }

  failPuzzle() {
    this.status.set('failed');
    this.newStreak.set(0);
    this.board.set({ movable: { color: undefined } });

    const pId = this.currentPuzzle()?.id;
    if (!pId) return;

    this.tacticsService.solvePuzzle(pId, false).subscribe((res) => {
      this.ratingChange.set(res.rating_change);
      this.newRating.set(res.new_rating);
      this.newStreak.set(res.new_streak);
      this.xpEarned.set(res.xp_earned);
      this.userService.loadMyProfile().subscribe();
    });
  }

  revealSolution() {
    this.hasRevealedSolution.set(true);

    const playNextMove = () => {
      if (this.currentMoveIndex >= this.solutionMoves.length) return;

      const move = this.solutionMoves[this.currentMoveIndex];
      this.chess.move(this.parseUciMove(move));
      this.currentMoveIndex++;

      this.board.set({
        fen: this.chess.fen(),
        turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
      });

      setTimeout(playNextMove, 750);
    };

    playNextMove();
  }

  private calculateDests() {
    const dests = new Map();
    this.chess.moves({ verbose: true }).forEach((m) => {
      if (!dests.has(m.from)) dests.set(m.from, []);
      dests.get(m.from).push(m.to);
    });
    return dests;
  }

  private parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
    return {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci.substring(4, 5) : undefined,
    };
  }
}
