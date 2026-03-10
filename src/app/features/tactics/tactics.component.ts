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
import { Header } from '../learn/components/header/header';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [CommonModule, Header],
  templateUrl: './tactics.component.html',
})
export class TacticsComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private userService = inject(UserService);
  private ngZone = inject(NgZone);

  @ViewChild('boardRef', { static: true }) boardRef!: ElementRef;

  private board!: Api;
  private chess = new Chess();

  currentPuzzle = signal<Puzzle | null>(null);
  solutionMoves: string[] = [];
  currentMoveIndex = 0;

  // UI Signals
  isLoading = signal<boolean>(true);
  hasRevealedSolution = signal<boolean>(false);
  userColor = signal<'white' | 'black'>('white');
  status = signal<'playing' | 'success' | 'failed'>('playing');
  ratingChange = signal<number | null>(null);
  newRating = signal<number | null>(null);
  streak = signal<number>(0);
  userRating = computed(() => this.userService.currentUser()?.progress?.puzzleRating ?? 1200);

  ngOnInit() {
    this.userService.loadMyProfile();
    this.loadNextPuzzle();
  }

  loadNextPuzzle() {
    this.status.set('playing');
    this.ratingChange.set(null);
    this.isLoading.set(true);
    this.hasRevealedSolution.set(false);

    this.tacticsService.getDailyPuzzle().subscribe((res) => {
      this.currentPuzzle.set(res.data);
      this.isLoading.set(false);

      const p = this.currentPuzzle();
      if (!p) {
        // no puzzles available in database yet!
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

    // 1. Lichess puzzles start by making the opponent's move automatically!
    const opponentInitialMove = this.solutionMoves[this.currentMoveIndex];
    this.chess.move(this.parseUciMove(opponentInitialMove));
    this.currentMoveIndex++;

    // 2. The user's color is whoever's turn it is NOW
    this.userColor.set(this.chess.turn() === 'w' ? 'white' : 'black');

    // 3. Render the board
    this.board = Chessground(this.boardRef.nativeElement, {
      fen: this.chess.fen(),
      orientation: this.userColor(),
      turnColor: this.userColor(),
      movable: {
        color: this.userColor(),
        free: false,
        dests: this.calculateDests(),
        events: {
          // 2. Tell Angular to watch this event!
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

    // Check if the move matches the solution sequence
    const expectedMove = this.solutionMoves[this.currentMoveIndex];
    const userMoveStr = `${orig}${dest}`; // e.g., "e2e4"

    // To handle pawn promotion syntax (e.g., e7e8q), we check if it starts with the expected move
    if (expectedMove.startsWith(userMoveStr)) {
      // CORRECT MOVE! Apply it to the internal brain
      this.chess.move(this.parseUciMove(expectedMove));
      this.currentMoveIndex++;

      // Sync the visual board with the internal logic
      this.board.set({
        fen: this.chess.fen(),
        turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
      });

      // Did they finish the whole puzzle?
      if (this.currentMoveIndex >= this.solutionMoves.length) {
        this.winPuzzle();
      } else {
        // Not done yet! The engine plays the next opponent move automatically
        setTimeout(() => {
          this.playOpponentMove();
        }, 500);
      }
    } else {
      // WRONG MOVE!

      // Revert the visual board to the last correct FEN so the wrong move doesn't stay on the board
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
    this.streak.update((s) => s + 1);
    this.board.set({ movable: { color: undefined } }); // Lock board

    const pId = this.currentPuzzle()?.id;
    if (!pId) return;

    this.tacticsService.solvePuzzle(pId, true).subscribe((res) => {
      this.ratingChange.set(res.rating_change);
      this.newRating.set(res.new_rating);
      // Reload profile to reflect new XP and rating network-wide
      this.userService.loadMyProfile();
    });
  }

  failPuzzle() {
    this.status.set('failed');
    this.streak.set(0);
    this.board.set({ movable: { color: undefined } }); // Lock board

    const pId = this.currentPuzzle()?.id;
    if (!pId) return;

    this.tacticsService.solvePuzzle(pId, false).subscribe((res) => {
      this.ratingChange.set(res.rating_change);
      this.newRating.set(res.new_rating);
      this.userService.loadMyProfile();
    });
  }

  revealSolution() {
    this.hasRevealedSolution.set(true);

    // Play the rest of the solution automatically
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
