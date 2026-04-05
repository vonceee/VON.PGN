import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  NgZone,
  OnChanges,
  afterNextRender,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Puzzle } from '../../../core/services/tactics.service';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-tactics-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full">
      <div #boardRef class="w-full h-full"></div>
    </div>
  `,
})
export class TacticsBoardComponent implements OnChanges {
  @ViewChild('boardRef', { static: false }) boardRef!: ElementRef;

  private _puzzle: Puzzle | null = null;
  @Input() 
  set puzzle(val: Puzzle | null) {
    this._puzzle = val;
    if (val) {
      setTimeout(() => this.initPuzzle(), 0);
    }
  }
  get puzzle() { return this._puzzle; }

  @Output() puzzleSolved = new EventEmitter<void>();
  @Output() puzzleFailed = new EventEmitter<void>();
  @Output() userColorChange = new EventEmitter<'white' | 'black'>();

  @Input() size: number = 400;

  private board!: Api;
  private chess = new Chess();

  solutionMoves: string[] = [];
  currentMoveIndex = 0;
  userColor: 'white' | 'black' = 'white';
  status: 'playing' | 'success' | 'failed' = 'playing';

  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);

  constructor(private ngZone: NgZone) {}

  ngOnChanges(changes: any) {
    if (changes.size && !changes.size.isFirstChange() && this.board) {
      setTimeout(() => {
        this.board.redrawAll();
      }, 0);
    }
  }

  initPuzzle() {
    if (!this.puzzle || !this.boardRef) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.status = 'playing';
    this.solutionMoves = this.puzzle.moves.split(' ');
    this.currentMoveIndex = 0;
    this.chess.load(this.puzzle.fen);

    const opponentInitialMove = this.solutionMoves[this.currentMoveIndex];
    this.chess.move(this.parseUciMove(opponentInitialMove));
    this.currentMoveIndex++;
    
    this.userColor = this.chess.turn() === 'w' ? 'white' : 'black';
    this.userColorChange.emit(this.userColor);

    this.board = Chessground(this.boardRef.nativeElement, {
      fen: this.chess.fen(),
      orientation: this.userColor,
      turnColor: this.userColor,
      coordinates: false,
      movable: {
        color: this.userColor,
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
    if (this.status !== 'playing') return;

    const expectedMove = this.solutionMoves[this.currentMoveIndex];
    const userMoveStr = `${orig}${dest}`;

    if (expectedMove.startsWith(userMoveStr)) {
      const moveResult = this.chess.move(this.parseUciMove(expectedMove));
      this.currentMoveIndex++;
      this.audioService.playMoveSound(moveResult?.san || '');

      this.board.set({
        fen: this.chess.fen(),
        turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
      });

      if (this.currentMoveIndex >= this.solutionMoves.length) {
        this.status = 'success';
        this.board.set({ movable: { color: undefined } });
        this.puzzleSolved.emit();
      } else {
        setTimeout(() => {
          this.playOpponentMove();
        }, 500);
      }
    } else {
      this.board.set({
        fen: this.chess.fen(),
        turnColor: this.userColor,
      });
      this.status = 'failed';
      this.board.set({ movable: { color: undefined } });
      this.puzzleFailed.emit();
    }
  }

  playOpponentMove() {
    const oppMove = this.solutionMoves[this.currentMoveIndex];
    const moveResult = this.chess.move(this.parseUciMove(oppMove));
    this.currentMoveIndex++;
    this.audioService.playMoveSound(moveResult?.san || '');

    this.board.set({
      fen: this.chess.fen(),
      turnColor: this.userColor,
      movable: { dests: this.calculateDests() },
    });
  }

  revealSolution() {
    if (!this.puzzle || this.status === 'success') return;
    
    // Resume moves
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
