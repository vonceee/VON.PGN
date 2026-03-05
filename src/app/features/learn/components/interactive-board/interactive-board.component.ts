// src/app/features/learn/components/interactive-board/interactive-board.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { InteractiveTask } from '../../../../core/models/course.model';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html'
})
export class InteractiveBoardComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) task!: InteractiveTask;
  @Output() taskCompleted = new EventEmitter<boolean>();
  @ViewChild('boardRef') boardRef!: ElementRef;

  private board!: Api; // chessboard UI
  private chess = new Chess(); // chess.js brain (chess logic)
  private currentMoveIndex = 0;

  ngAfterViewInit() {
    this.initBoard();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['task'] && this.board) {
      this.resetBoard();
    }
  }

  initBoard() {
    this.chess.load(this.task.startingFen);
    
    this.board = Chessground(this.boardRef.nativeElement, {
      fen: this.task.startingFen,
      movable: {
        color: 'white',
        free: true,
        dests: this.calculateDests(),
        events: {
          after: (orig, dest) => this.onMoveAttempt(orig, dest)
        }
      }
    });
  }

  resetBoard() {
    this.currentMoveIndex = 0;
    this.chess.load(this.task.startingFen);
    this.board.set({ fen: this.task.startingFen });
  }

  onMoveAttempt(orig: string, dest: string) {
    try {
      // 1. Ask the invisible brain if the move is physically legal
      const move = this.chess.move({ from: orig, to: dest });

      // ==========================================
      // MODE A: STRICT PUZZLE (Has expected moves)
      // ==========================================
      if (this.task.expectedMoves && this.task.expectedMoves.length > 0) {
        const expectedSan = this.task.expectedMoves[this.currentMoveIndex];

        if (move.san === expectedSan) {
          this.currentMoveIndex++;
          if (this.currentMoveIndex === this.task.expectedMoves.length) {
            this.taskCompleted.emit(true);
          }
        } else {
           alert("Oops! Not the right move for this lesson.");
           this.chess.undo(); 
           this.board.set({ fen: this.chess.fen(), turnColor: 'white', movable: { dests: this.calculateDests() } });
        }
      } 
      // ==========================================
      // MODE B: SANDBOX (Free play)
      // ==========================================
      else {
        // It was a completely legal move, and there's no strict puzzle!
        
        // Hack the FEN to force it to stay White's turn so they can keep practicing
        const currentFen = this.chess.fen();
        const forceWhiteFen = currentFen.replace(' b ', ' w '); 
        
        this.chess.load(forceWhiteFen); // Load the hacked FEN into the brain
        
        // Update the visual board with the new legal moves
        this.board.set({ 
          fen: forceWhiteFen, 
          turnColor: 'white', 
          movable: { dests: this.calculateDests() } 
        });

        // Emit success immediately so they can click "Next Lesson" whenever they feel ready
        this.taskCompleted.emit(true);
      }
      
    } catch(e) {
      // It was an entirely illegal move (like moving a rook diagonally)
      this.board.set({ fen: this.chess.fen(), turnColor: 'white', movable: { dests: this.calculateDests() } }); 
    }
  }

  // Add this inside your InteractiveBoardComponent class
  calculateDests() {
    const dests = new Map();
    // Ask chess.js for every legal move in the current position
    this.chess.moves({ verbose: true }).forEach(m => {
      if (!dests.has(m.from)) dests.set(m.from, []);
      dests.get(m.from).push(m.to);
    });
    return dests;
  }
}