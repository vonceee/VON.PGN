import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Puzzle } from '../../../../core/services/tactics.service';
import { Chess } from 'chess.js';
import { Config } from 'chessground/config';
import { AudioService } from '../../../../core/services/audio.service';
import { ChessBoardComponent } from '@shared/chess';

@Component({
  selector: 'app-tactics-board',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
    <app-chess-board
      #board
      [fen]="currentFen"
      [orientation]="userColor"
      [interactive]="status === 'playing' || exploreMode"
      [size]="size"
      [configOverride]="cgConfig"
      [storageKey]="'boardSize'"
      (moveMade)="onBoardMove($event)"
      (sizeChange)="sizeChange.emit($event)"
      class="w-full h-full"
    ></app-chess-board>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class TacticsBoardComponent implements OnChanges {
  @ViewChild('board') boardComponent!: ChessBoardComponent;

  private _puzzle: Puzzle | null = null;
  @Input() 
  set puzzle(val: Puzzle | null) {
    this._puzzle = val;
    if (val) {
      this.initPuzzle();
    }
  }
  get puzzle() { return this._puzzle; }

  @Output() puzzleSolved = new EventEmitter<void>();
  @Output() puzzleFailed = new EventEmitter<void>();
  @Output() userColorChange = new EventEmitter<'white' | 'black'>();
  @Output() wrongMove = new EventEmitter<void>();
  @Output() moveMade = new EventEmitter<string>();
  @Output() sizeChange = new EventEmitter<number>();

  @Input() size: number = 400;
  @Input() exploreMode: boolean = false;

  private _retryMode: boolean = false;
  @Input()
  set retryMode(val: boolean) {
    this._retryMode = val;
  }
  get retryMode() { return this._retryMode; }

  private chess = new Chess();
  currentFen: string = '';
  solutionMoves: string[] = [];
  solutionPly = 0;
  userColor: 'white' | 'black' = 'white';
  status: 'playing' | 'success' | 'failed' = 'playing';

  initialFen: string = '';
  gameMoves: string[] = [];
  gamePly = 0;
  gameMode = false;
  private gameStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  cgConfig: Config = {};
  isRevealing = false;

  private audioService = inject(AudioService);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['exploreMode'] && !changes['exploreMode'].isFirstChange()) {
      if (this.exploreMode && this.status === 'success') {
        this.enableFreePlay();
      }
    }
  }

  initPuzzle() {
    if (!this.puzzle) return;

    this.status = 'playing';
    this._retryMode = false;
    this.gameMode = false;
    this.gameMoves = [];
    this.gamePly = 0;
    this.solutionMoves = this.puzzle.moves.split(' ');
    this.solutionPly = 0;
    this.chess.load(this.puzzle.fen);

    const opponentInitialMove = this.solutionMoves[this.solutionPly];
    const moveResult = this.chess.move(this.parseUciMove(opponentInitialMove));
    this.solutionPly++;
    if (moveResult) this.moveMade.emit(moveResult.san);
    
    this.userColor = this.chess.turn() === 'w' ? 'white' : 'black';
    this.initialFen = this.chess.fen();
    this.currentFen = this.initialFen;
    this.userColorChange.emit(this.userColor);

    this.cgConfig = {
      movable: {
        color: this.userColor,
        free: false
      }
    };
  }

  onBoardMove(event: { from: string; to: string; san: string; fen: string }) {
    if (this.gameMode) return;
    if (this.status !== 'playing') return;

    const expectedMove = this.solutionMoves[this.solutionPly];
    const userMoveStr = `${event.from}${event.to}`;

    if (expectedMove.startsWith(userMoveStr)) {
      this.chess.move(this.parseUciMove(expectedMove));
      this.solutionPly++;
      
      this.moveMade.emit(event.san);
      this.currentFen = this.chess.fen(); // Safe because of new guards in ChessBoardComponent

      if (this.solutionPly >= this.solutionMoves.length) {
        this.status = 'success';
        this.puzzleSolved.emit();
        if (this.exploreMode) {
          this.enableFreePlay();
        } else {
          // Disable interactive moves after solving
          this.cgConfig = { 
            movable: { 
              color: undefined,
              dests: new Map()
            } 
          };
        }
      } else {
        setTimeout(() => {
          this.playOpponentMove();
        }, 500);
      }
    } else {
      // Revert the legal but incorrect move on the board
      this.boardComponent.undoMove();
      
      if (!this._retryMode) {
        this._retryMode = true;
        this.wrongMove.emit();
        setTimeout(() => this.retryPuzzle(), 500);
      } else {
        this.retryPuzzle();
      }
    }
  }

  retryPuzzle() {
    this.chess.load(this.initialFen);
    this.currentFen = this.initialFen;
    this.solutionPly = 1; // Correctly start after the initial opponent move
    this.cgConfig = {
      movable: {
        color: this.userColor,
        free: false
      }
    };
  }

  enableFreePlay() {
    this.cgConfig = {
      movable: {
        color: 'both',
        free: true,
      },
    };
  }

  setGameMoves(moves: string[]) {
    this.gameMoves = moves;
    this.gamePly = 0;
  }

  exitGameMode() {
    this.gameMode = false;
    this.chess.load(this.puzzle?.fen || '');
    for (let i = 0; i < this.solutionPly; i++) {
      this.chess.move(this.parseUciMove(this.solutionMoves[i]));
    }
    this.currentFen = this.chess.fen();
    this.cgConfig = {
      movable: {
        color: this.status === 'playing' ? this.userColor : undefined
      }
    };

    if (this.exploreMode && this.status === 'success') {
      this.enableFreePlay();
    }
  }

  loadGame(moves: string[]) {
    this.gameMoves = moves;
    this.gamePly = 0;
    this.gameMode = true;
    this.chess.load(this.gameStartFen);
    this.currentFen = this.chess.fen();
  }

  setGameModeAtMove(moves: string[], ply: number) {
    this.gameMoves = [...moves];
    this.gamePly = Math.max(0, Math.min(ply, moves.length));
    this.gameMode = true;
    
    this.chess.load(this.gameStartFen);
    for (let i = 0; i < this.gamePly; i++) {
       const m = moves[i];
       if (m) this.chess.move(m);
    }
    this.currentFen = this.chess.fen();
  }

  resetToGameStart() {
    this.gameMode = true;
    this.chess.load(this.gameStartFen);
    this.gamePly = 0;
    this.currentFen = this.chess.fen();
  }

  previousGameMove() {
    this.gameMode = true;
    if (this.gamePly <= 0) return;
    this.chess.undo();
    this.gamePly--;
    this.currentFen = this.chess.fen();
  }

  nextGameMove() {
    this.gameMode = true;
    if (this.gamePly >= this.gameMoves.length) return;
    const move = this.gameMoves[this.gamePly];
    this.gamePly++;
    const moveResult = this.chess.move(move);
    if (moveResult) {
      this.audioService.playMoveSound(moveResult.san || '');
      this.currentFen = this.chess.fen();
    }
  }

  isFirstGameMove(): boolean {
    return this.gameMode && this.gamePly === 0;
  }

  isLastGameMove(): boolean {
    return this.gameMode && this.gamePly >= this.gameMoves.length;
  }

  playOpponentMove() {
    const oppMove = this.solutionMoves[this.solutionPly];
    const moveResult = this.chess.move(this.parseUciMove(oppMove));
    this.solutionPly++;
    if (moveResult) this.moveMade.emit(moveResult.san);
    this.audioService.playMoveSound(moveResult?.san || '');
    this.currentFen = this.chess.fen();
  }

  revealSolution() {
    if (!this.puzzle || this.status === 'success' || this.isRevealing) return;
    
    this.isRevealing = true;
    const playNextMove = () => {
      if (this.solutionPly >= this.solutionMoves.length) {
        this.isRevealing = false;
        return;
      }
      
      const moveUci = this.solutionMoves[this.solutionPly];
      let moveResult = null;
      
      try {
        moveResult = this.chess.move(this.parseUciMove(moveUci));
      } catch (err) {
        console.error('[Tactics] Reveal failed: Illegal move', moveUci, 'at ply', this.solutionPly, err);
      }
      
      this.solutionPly++;
      
      if (moveResult) {
        this.moveMade.emit(moveResult.san);
        this.audioService.playMoveSound(moveResult.san);
        this.currentFen = this.chess.fen();
        setTimeout(playNextMove, 750);
      } else {
        console.warn('[Tactics] Reveal halted: Could not execute move', moveUci);
        this.isRevealing = false;
      }
    };
    playNextMove();
  }

  private parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
    return {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci.substring(4, 5) : undefined,
    };
  }
}


