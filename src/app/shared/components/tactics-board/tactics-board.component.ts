import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  NgZone,
  OnChanges,
  OnDestroy,
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
    <div #boardRef class="w-full h-full"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class TacticsBoardComponent implements OnChanges, OnDestroy {
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
  @Output() wrongMove = new EventEmitter<void>();

  @Output() sizeChange = new EventEmitter<number>();

  @Input() size: number = 400;
  @Input() exploreMode: boolean = false;

  private _retryMode: boolean = false;
  @Input()
  set retryMode(val: boolean) {
    this._retryMode = val;
  }
  get retryMode() { return this._retryMode; }

  private board!: Api;
  private chess = new Chess();

  solutionMoves: string[] = [];
  currentMoveIndex = 0;
  userColor: 'white' | 'black' = 'white';
  status: 'playing' | 'success' | 'failed' = 'playing';

  initialFen: string = '';
  gameMoves: string[] = [];
  gameMoveIndex = -1;
  gameMode = false;
  private gameStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);

  constructor(private ngZone: NgZone) {}

  ngOnChanges(changes: any) {
    if (changes.size && !changes.size.isFirstChange() && this.board) {
      setTimeout(() => {
        this.board.redrawAll();
      }, 0);
    }
    if (changes.exploreMode && !changes.exploreMode.isFirstChange()) {
      if (this.exploreMode && this.status === 'success') {
        this.enableFreePlay();
      }
    }
  }

  ngOnDestroy(): void {
    this.board?.destroy();
  }

  initPuzzle() {
    if (!this.puzzle || !this.boardRef) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.status = 'playing';
    this._retryMode = false;
    this.solutionMoves = this.puzzle.moves.split(' ');
    this.currentMoveIndex = 0;
    this.chess.load(this.puzzle.fen);

    const opponentInitialMove = this.solutionMoves[this.currentMoveIndex];
    this.chess.move(this.parseUciMove(opponentInitialMove));
    this.currentMoveIndex++;
    
    this.userColor = this.chess.turn() === 'w' ? 'white' : 'black';
    this.initialFen = this.chess.fen();
    this.userColorChange.emit(this.userColor);

    this.board = Chessground(this.boardRef.nativeElement, {
      fen: this.chess.fen(),
      orientation: this.userColor,
      turnColor: this.userColor,
      coordinates: true,
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
        this.puzzleSolved.emit();
        if (this.exploreMode) {
          this.enableFreePlay();
        } else {
          this.board.set({ movable: { color: undefined } });
        }
      } else {
        setTimeout(() => {
          this.playOpponentMove();
        }, 500);
      }
    } else {
      if (!this._retryMode) {
        this._retryMode = true;
        this.wrongMove.emit();
        this.board.set({
          fen: this.chess.fen(),
          turnColor: this.userColor,
        });
        setTimeout(() => this.retryPuzzle(), 500);
      } else {
        this.retryPuzzle();
      }
    }
  }

  retryPuzzle() {
    this.chess.load(this.initialFen);
    this.currentMoveIndex = 1;
    
    this.board.set({
      fen: this.chess.fen(),
      orientation: this.userColor,
      turnColor: this.userColor,
      movable: {
        color: this.userColor,
        free: false,
        dests: this.calculateDests(),
      },
    });
  }

  enableFreePlay() {
    this.board.set({
      movable: {
        color: 'both',
        free: true,
      },
    });
  }

  setGameMoves(moves: string[]) {
    this.gameMoves = moves;
    this.gameMoveIndex = -1;
    // Don't set gameMode = true yet, we want to stay in puzzle mode
  }

  loadGame(moves: string[]) {
    if (!this.board) return;
    this.gameMoves = moves;
    this.gameMoveIndex = -1;
    this.gameMode = true;
    this.chess.load(this.gameStartFen);
    this.updateBoardForGame();
  }

  setGameModeAtMove(moves: string[], moveIndex: number) {
    if (!this.board) return;
    this.gameMoves = moves;
    this.gameMoveIndex = moveIndex;
    this.gameMode = true;
    
    // Rebuild the history up to moveIndex
    this.chess.load(this.gameStartFen);
    for (let i = 0; i <= moveIndex; i++) {
      this.chess.move(moves[i]);
    }
    
    this.updateBoardForGame();
  }

  private ensureGameMode() {
    if (!this.gameMode) {
      this.gameMode = true;
      this.chess.load(this.gameStartFen);
      this.gameMoveIndex = -1;
      this.updateBoardForGame();
    }
  }

  resetToGameStart() {
    if (!this.board) return;
    this.ensureGameMode();
    this.chess.load(this.gameStartFen);
    this.gameMoveIndex = -1;
    this.updateBoardForGame();
  }

  previousGameMove() {
    if (!this.board) return;
    this.ensureGameMode();
    
    if (this.gameMoveIndex < 0) return;
    
    this.chess.undo();
    this.gameMoveIndex--;
    this.updateBoardForGame();
  }

  nextGameMove() {
    if (!this.board) return;
    this.ensureGameMode();
    
    if (this.gameMoveIndex >= this.gameMoves.length - 1) return;
    
    this.gameMoveIndex++;
    const move = this.gameMoves[this.gameMoveIndex];
    const moveResult = this.chess.move(move);
    if (moveResult) {
      this.audioService.playMoveSound(moveResult.san || '');
      this.updateBoardForGame();
    }
  }

  isFirstGameMove(): boolean {
    return this.gameMode && this.gameMoveIndex < 0;
  }

  isLastGameMove(): boolean {
    return this.gameMode && this.gameMoveIndex >= this.gameMoves.length - 1;
  }

  private updateBoardForGame() {
    if (!this.board) return;
    const turnColor = this.chess.turn() === 'w' ? 'white' : 'black';
    this.board.set({
      fen: this.chess.fen(),
      turnColor: turnColor,
      check: this.chess.inCheck() ? turnColor : undefined,
    });
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
