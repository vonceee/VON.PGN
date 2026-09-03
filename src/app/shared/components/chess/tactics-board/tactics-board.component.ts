import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  ViewChild,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Puzzle } from '../../../../features/tactics/models/tactics.model';
import { Chess, Move } from 'chess.js';
import { Config } from 'chessground/config';
import { AudioService } from '../../../../core/services/audio.service';
import { ChessBoardComponent } from '@shared/chess';
import { DevLogger } from '../../../../core/utils/dev-logger';

@Component({
  selector: 'app-tactics-board',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
  <div class="w-full h-full flex items-center justify-center">
    <app-chess-board
      #board
      [fen]="currentFen"
      [lastMove]="lastMove"
      [orientation]="userColor"
      [interactive]="status === 'playing' || exploreMode"
      [configOverride]="cgConfig"
      (moveMade)="onBoardMove($event)"
      class="block"
    ></app-chess-board>
  </div>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class TacticsBoardComponent implements OnChanges, OnDestroy {
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

  private _exploreMode: boolean = false;
  @Input()
  set exploreMode(val: boolean) {
    this._exploreMode = val;
    if (val) {
      this.enableFreePlay();
    }
  }
  get exploreMode() { return this._exploreMode; }

  private _retryMode: boolean = false;
  @Input()
  set retryMode(val: boolean) {
    this._retryMode = val;
  }
  get retryMode() { return this._retryMode; }

  private chess = new Chess();
  currentFen: string = '';
  lastMove: any[] | undefined = undefined;
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
  private introTimeout: any;

  private audioService = inject(AudioService);
  private platformId = inject(PLATFORM_ID);

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['exploreMode'] && !changes['exploreMode'].isFirstChange()) {
      if (this.exploreMode) {
        this.enableFreePlay();
      }
    }
  }

  ngOnDestroy() {
    if (this.introTimeout) {
      clearTimeout(this.introTimeout);
    }
  }

  initPuzzle() {
    if (!this.puzzle) return;

    if (this.introTimeout) {
      clearTimeout(this.introTimeout);
    }

    this.status = 'playing';
    this._retryMode = false;
    this.gameMode = false;
    this.gameMoves = [];
    this.gamePly = 0;
    this.solutionMoves = this.puzzle.moves.split(' ');
    this.solutionPly = 0;
    this.lastMove = undefined;
    
    // Set board to the puzzle's starting FEN
    this.chess.load(this.puzzle.fen);
    this.currentFen = this.puzzle.fen;
    this.initialFen = this.puzzle.fen;
    
    // The side that is NOT currently to move in puzzle.fen is the user, 
    // because the first move in solutionMoves is the opponent's move.
    this.userColor = this.chess.turn() === 'w' ? 'black' : 'white';
    this.userColorChange.emit(this.userColor);

    // CRITICAL: Explicitly disable animations during base FEN swap so pieces do NOT fly from the previous puzzle
    this.cgConfig = {
      animation: { enabled: false },
      movable: {
        color: this.userColor,
        free: false
      }
    };

    // Play the first opponent move (intro move) after a brief delay so the user clearly sees the setup move
    if (!this.isBrowser) return;

    this.introTimeout = setTimeout(() => {
      if (this.solutionPly === 0 && !this.gameMode) {
        // Re-enable animation for the opponent's setup move
        this.cgConfig = {
          animation: { enabled: true },
          movable: {
            color: this.userColor,
            free: false
          }
        };
        this.playOpponentMove();
      }
    }, 500);
  }

  onBoardMove(event: { move: Move; fen: string }) {
    // Resume audio context on first move if needed
    this.audioService.resume();
    if (this.gameMode && !this.exploreMode) return;

    const { move, fen } = event;

    if (this.exploreMode) {
      try {
        const moveResult = this.chess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });

        if (moveResult) {
          this.audioService.playChessMove(moveResult);
          this.lastMove = [moveResult.from, moveResult.to];
          this.currentFen = this.chess.fen();
          if (this.gameMode) {
            this.gameMoves = this.gameMoves.slice(0, this.gamePly);
            this.gameMoves.push(moveResult.san);
            this.gamePly = this.gameMoves.length;
          }
          this.moveMade.emit(moveResult.san);
        } else {
          this.boardComponent.undoMove();
        }
      } catch (err) {
        this.boardComponent.undoMove();
      }
      return;
    }

    if (this.status !== 'playing') return;
    this.audioService.playChessMove(move);
    this.lastMove = [move.from, move.to];

    const expectedMove = this.solutionMoves[this.solutionPly];
    const userMoveStr = `${move.from}${move.to}`;

    if (expectedMove.startsWith(userMoveStr)) {
      const moveResult = this.chess.move(this.parseUciMove(expectedMove));
      this.solutionPly++;
      
      this.moveMade.emit(move.san);
      this.currentFen = fen; // Safe because of new guards in ChessBoardComponent

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
      }
      this.wrongMove.emit();
      setTimeout(() => this.retryPuzzle(), 500);
    }
  }

  retryPuzzle() {
    this.chess.load(this.initialFen);
    this.currentFen = this.initialFen;
    this.solutionPly = 1; // Correctly start after the initial opponent move
    
    // Set lastMove to the move that led to initialFen (the first computer move)
    const firstMoveUci = this.solutionMoves[0];
    if (firstMoveUci) {
      this.lastMove = [firstMoveUci.substring(0, 2), firstMoveUci.substring(2, 4)];
    }

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
    this.syncLastMoveFromChess();

    if (this.exploreMode) {
      this.enableFreePlay();
    }
  }

  loadGame(moves: string[]) {
    this.gameMoves = moves;
    this.gamePly = 0;
    this.gameMode = true;
    const startFen = this.puzzle?.fen || this.gameStartFen;
    this.chess.load(startFen);
    this.currentFen = this.chess.fen();
    this.syncLastMoveFromChess();
  }

  setGameModeAtMove(moves: string[], ply: number) {
    this.gameMoves = [...moves];
    this.gamePly = Math.max(0, Math.min(ply, moves.length));
    this.gameMode = true;
    
    const startFen = this.puzzle?.fen || this.gameStartFen;
    this.chess.load(startFen);
    for (let i = 0; i < this.gamePly; i++) {
       const m = moves[i];
       if (m) this.chess.move(m);
    }
    this.currentFen = this.chess.fen();
    this.syncLastMoveFromChess();
  }

  resetToGameStart() {
    this.gameMode = true;
    const startFen = this.puzzle?.fen || this.gameStartFen;
    this.chess.load(startFen);
    this.gamePly = 0;
    this.currentFen = this.chess.fen();
    this.syncLastMoveFromChess();
  }

  previousGameMove() {
    this.gameMode = true;
    if (this.gamePly <= 0) return;
    this.chess.undo();
    this.gamePly--;
    this.currentFen = this.chess.fen();
    this.syncLastMoveFromChess();
    this.audioService.playNavigationSound();
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
      this.syncLastMoveFromChess();
    }
  }

  private syncLastMoveFromChess() {
    const history = this.chess.history({ verbose: true });
    const last = history[history.length - 1];
    if (last) {
      this.lastMove = [last.from, last.to];
    } else {
      this.lastMove = undefined;
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
    if (moveResult) {
      this.moveMade.emit(moveResult.san);
      this.lastMove = [moveResult.from, moveResult.to];
      this.audioService.playChessMove(moveResult);
      this.currentFen = this.chess.fen();
      if (this.solutionPly === 1) {
        this.initialFen = this.currentFen;
      }

      // In the rare case that the opponent move was the only/last move of the puzzle
      if (this.solutionPly >= this.solutionMoves.length) {
        this.status = 'success';
        this.puzzleSolved.emit();
      }
    }
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
        DevLogger.error('[Tactics] Reveal failed: Illegal move', moveUci, 'at ply', this.solutionPly, err);
      }
      
      this.solutionPly++;
      
      if (moveResult) {
        this.moveMade.emit(moveResult.san);
        this.audioService.playMoveSound(moveResult.san);
        this.currentFen = this.chess.fen();
        setTimeout(playNextMove, 750);
      } else {
        DevLogger.warn('[Tactics] Reveal halted: Could not execute move', moveUci);
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


