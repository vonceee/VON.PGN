import { Component, ElementRef, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TacticsService, Puzzle } from '../../core/services/tactics.service';
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

  @ViewChild('boardRef', { static: true }) boardRef!: ElementRef;

  private board!: Api;
  private chess = new Chess();

  currentPuzzle: Puzzle | null = null;
  solutionMoves: string[] = [];
  currentMoveIndex = 0;

  userColor: 'white' | 'black' = 'white';

  // UI States
  status: 'playing' | 'success' | 'failed' = 'playing';
  ratingChange: number | null = null;
  newRating: number | null = null;

  ngOnInit() {
    this.loadNextPuzzle();
  }

  loadNextPuzzle() {
    this.status = 'playing';
    this.ratingChange = null;

    this.tacticsService.getDailyPuzzle().subscribe((res) => {
      this.currentPuzzle = res.data;
      if (!this.currentPuzzle) {
        // No puzzles available in database yet!
        return;
      }
      this.solutionMoves = this.currentPuzzle.moves.split(' ');
      this.currentMoveIndex = 0;
      this.initPuzzle();
    });
  }

  initPuzzle() {
    if (!this.currentPuzzle) return;

    this.chess.load(this.currentPuzzle.fen);

    // 1. Lichess puzzles start by making the opponent's move automatically!
    const opponentInitialMove = this.solutionMoves[this.currentMoveIndex];
    this.chess.move(this.parseUciMove(opponentInitialMove));
    this.currentMoveIndex++;

    // 2. The user's color is whoever's turn it is NOW
    this.userColor = this.chess.turn() === 'w' ? 'white' : 'black';

    // 3. Render the board
    this.board = Chessground(this.boardRef.nativeElement, {
      fen: this.chess.fen(),
      orientation: this.userColor,
      turnColor: this.userColor,
      movable: {
        color: this.userColor,
        free: false,
        dests: this.calculateDests(),
        events: {
          after: (orig, dest) => this.onUserMove(orig, dest),
        },
      },
    });
  }

  onUserMove(orig: any, dest: any) {
    if (this.status !== 'playing') return;

    // Check if the move matches the solution sequence
    const expectedMove = this.solutionMoves[this.currentMoveIndex];
    const userMoveStr = `${orig}${dest}`; // e.g., "e2e4"

    // To handle pawn promotion syntax (e.g., e7e8q), we check if it starts with the expected move
    if (expectedMove.startsWith(userMoveStr)) {
      // CORRECT MOVE! Apply it to the internal brain
      this.chess.move(this.parseUciMove(expectedMove));
      this.currentMoveIndex++;

      // Did they finish the whole puzzle?
      if (this.currentMoveIndex >= this.solutionMoves.length) {
        this.winPuzzle();
      } else {
        // Not done yet! The engine plays the next opponent move automatically
        setTimeout(() => this.playOpponentMove(), 500);
      }
    } else {
      // WRONG MOVE!
      this.failPuzzle();
    }
  }

  playOpponentMove() {
    const oppMove = this.solutionMoves[this.currentMoveIndex];
    this.chess.move(this.parseUciMove(oppMove));
    this.currentMoveIndex++;

    this.board.set({
      fen: this.chess.fen(),
      turnColor: this.userColor,
      movable: { dests: this.calculateDests() },
    });
  }

  winPuzzle() {
    this.status = 'success';
    this.board.set({ movable: { color: undefined } }); // Lock board

    this.tacticsService.solvePuzzle(this.currentPuzzle!.id, true).subscribe((res) => {
      this.ratingChange = res.rating_change;
      this.newRating = res.new_rating;
    });
  }

  failPuzzle() {
    this.status = 'failed';
    this.board.set({ movable: { color: undefined } }); // Lock board

    this.tacticsService.solvePuzzle(this.currentPuzzle!.id, false).subscribe((res) => {
      this.ratingChange = res.rating_change;
      this.newRating = res.new_rating;
    });
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
