import { Component, OnInit, OnDestroy, inject, signal, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Chess, Move } from 'chess.js';
import { EngineService } from '../../../core/services/engine.service';
import { ChessBoardComponent } from '@shared/chess';
import { ButtonComponent } from '@shared/ui';
import { TIME_CONTROLS } from '../../../core/models/game.model';
import { MoveNotationComponent } from '@shared/chess';
import { AudioService } from '../../../core/services/audio.service';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-computer-play',
  standalone: true,
  imports: [CommonModule, FormsModule, ChessBoardComponent, ButtonComponent, MoveNotationComponent],
  templateUrl: './computer-play.component.html',
})
export class ComputerPlayComponent implements OnInit, OnDestroy {
  engineService = inject(EngineService);
  private audioService = inject(AudioService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild(ChessBoardComponent) board!: ChessBoardComponent;

  // Game Setup State (from query params)
  isSetup = signal(true);
  private gameConfig = {
    level: 1,
    color: 'random' as 'white' | 'black' | 'random',
    time: null as string | null,
  };

  // Game Play State
  game = new Chess();
  playerColor = signal<'white' | 'black'>('white');
  status = signal<'playing' | 'mate' | 'draw' | 'out-of-time' | 'resigned'>('playing');
  engineEval = signal<string>('0.0');
  pgnMoves = signal<string[]>([]);
  displayPly = signal<number>(0);
  isEngineThinking = signal(false);
  gameStateCounter = signal(0);
  showResignConfirm = signal(false);
  selectedLevel = signal(1); // Kept only for UI display

  displayFen = computed(() => {
    const ply = this.displayPly();
    const moves = this.pgnMoves();

    if (ply === moves.length) {
      return this.game.fen();
    }

    const temp = new Chess();
    for (let i = 0; i < ply; i++) {
      try {
        temp.move(moves[i]);
      } catch (e) {
        console.error('[ComputerPlay] Navigation error:', e);
        break;
      }
    }
    return temp.fen();
  });

  isLive = computed(() => this.displayPly() === this.pgnMoves().length);

  resultDetails = computed(() => {
    const s = this.status();
    if (s === 'playing') return null;

    let score = '*';
    let label = 'Game Over';
    let detail = '';

    if (s === 'mate') {
      const winner = this.game.turn() === 'w' ? 'Black' : 'White';
      score = winner === 'White' ? '1-0' : '0-1';
      label = 'Checkmate';
      detail = `${winner} won`;
    } else if (s === 'resigned') {
      const winner = this.playerColor() === 'white' ? 'Black' : 'White';
      const loser = this.playerColor() === 'white' ? 'White' : 'Black';
      score = winner === 'White' ? '1-0' : '0-1';
      label = 'Resigned';
      detail = `${loser} resigned • ${winner} won`;
    } else if (s === 'out-of-time') {
      const winner = this.whiteTimeMs() === 0 ? 'Black' : 'White';
      const loser = this.whiteTimeMs() === 0 ? 'White' : 'Black';
      score = winner === 'White' ? '1-0' : '0-1';
      label = 'Time out';
      detail = `${loser} out of time • ${winner} won`;
    } else if (s === 'draw') {
      score = '½-½';
      label = 'Draw';
      if (this.game.isStalemate()) detail = 'Stalemate';
      else if (this.game.isThreefoldRepetition()) detail = 'Threefold repetition';
      else if (this.game.isInsufficientMaterial()) detail = 'Insufficient material';
      else detail = 'Draw by agreement';
    }

    return { score, label, detail };
  });

  // Time management signals
  whiteTimeMs = signal(0);
  blackTimeMs = signal(0);
  private timerInterval: any;

  private currentIncrementMs = 0;

  isMyTurn = computed(() => {
    this.gameStateCounter(); // Track dependency on game state mutations
    const turnCode = this.game.turn();
    const playerCode = this.playerColor() === 'white' ? 'w' : 'b';
    return this.status() === 'playing' && turnCode === playerCode && this.isLive();
  });

  playerTimeMs = computed(() =>
    this.playerColor() === 'white' ? this.whiteTimeMs() : this.blackTimeMs(),
  );
  opponentTimeMs = computed(() =>
    this.playerColor() === 'white' ? this.blackTimeMs() : this.whiteTimeMs(),
  );

  ngOnInit() {
    this.engineService.bestMove$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((move) => {
      this.onEngineMove(move);
    });

    this.engineService.evaluation$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evalStr) => {
        this.engineEval.set(evalStr);
      });

    // Handle initialization from query params
    const params = this.route.snapshot.queryParams;
    if (!params['level'] || !params['time']) {
      // Production Safety: Redirect back to play selector if params are missing
      this.router.navigate(['/play']);
      return;
    }

    this.gameConfig = {
      level: parseInt(params['level'], 10) || 1,
      color: params['color'] || 'random',
      time: params['time'],
    };
    this.selectedLevel.set(this.gameConfig.level);

    // Initial launch
    setTimeout(() => this.startGame(), 100);
  }

  ngOnDestroy() {
    this.stopTimer();
    this.engineService.stop();
  }

  startGame() {
    // 1. Setup sides
    this.playerColor.set(
      this.gameConfig.color === 'random'
        ? Math.random() > 0.5
          ? 'white'
          : 'black'
        : (this.gameConfig.color as 'white' | 'black'),
    );

    // 2. Setup times & increment
    let baseMs = 10 * 60 * 1000;
    this.currentIncrementMs = 0;

    const timeStr = this.gameConfig.time;
    if (timeStr) {
      if (timeStr.includes('+')) {
        const [minStr, incStr] = timeStr.split('+');
        baseMs = parseInt(minStr, 10) * 1000;
        this.currentIncrementMs = parseInt(incStr, 10) * 1000;
      } else {
        const tc = TIME_CONTROLS.find((t) => t.value === timeStr);
        if (tc) {
          baseMs = tc.baseSeconds * 1000;
          this.currentIncrementMs = tc.incrementSeconds * 1000;
        }
      }
    }

    this.whiteTimeMs.set(baseMs);
    this.blackTimeMs.set(baseMs);

    // 3. Prepare Engine
    this.engineService.prepareGame(this.gameConfig.level);

    // 4. Start
    this.game.reset();
    this.isSetup.set(false);
    this.showResignConfirm.set(false);
    this.status.set('playing');
    this.pgnMoves.set([]);
    this.displayPly.set(0);
    this.engineEval.set('0.0');
    this.isEngineThinking.set(false);
    this.gameStateCounter.update((c) => c + 1);
    this.audioService.playBoardStart();

    this.startTimer();

    if (this.playerColor() === 'black') {
      this.requestEngineMove();
    }
  }

  onUserMove(event: { move: Move; fen: string }) {
    if (this.status() !== 'playing' || !this.isMyTurn()) return;

    const { move, fen } = event;
    this.audioService.playChessMove(move);
    // Update local state
    this.game.load(fen);
    this.pgnMoves.update((moves) => [...moves, move.san]);
    this.displayPly.set(this.pgnMoves().length);
    this.isEngineThinking.set(true);
    this.gameStateCounter.update((c) => c + 1);

    if (this.checkGameOver()) return;

    // Apply increment if applicable
    if (this.playerColor() === 'white') {
      this.whiteTimeMs.update((t) => t + this.currentIncrementMs);
    } else {
      this.blackTimeMs.update((t) => t + this.currentIncrementMs);
    }

    this.requestEngineMove();
  }

  private requestEngineMove() {
    const fen = this.game.fen();
    this.engineService.requestMove(
      fen,
      this.whiteTimeMs(),
      this.blackTimeMs(),
      this.currentIncrementMs,
      this.currentIncrementMs,
    );
  }

  private onEngineMove(move: { from: string; to: string; promotion?: string }) {
    if (this.status() !== 'playing' || this.isMyTurn()) return;

    try {
      const result = this.game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });

      if (result) {
        this.showResignConfirm.set(false);
        this.audioService.playMoveSound(result.san);
        this.pgnMoves.update((moves) => [...moves, result.san]);
        this.displayPly.set(this.pgnMoves().length);
        this.isEngineThinking.set(false);
        this.gameStateCounter.update((c) => c + 1);

        // Apply engine increment
        if (this.playerColor() === 'white') {
          this.blackTimeMs.update((t) => t + this.currentIncrementMs);
        } else {
          this.whiteTimeMs.update((t) => t + this.currentIncrementMs);
        }

        this.checkGameOver();
      }
    } catch (e) {
      console.error('[ComputerPlay] Invalid engine move:', move, e);
    }
  }

  private checkGameOver(): boolean {
    if (this.game.isCheckmate()) {
      this.status.set('mate');
      this.audioService.playBoardEnd();
      this.stopTimer();
      return true;
    }
    if (this.game.isDraw() || this.game.isStalemate() || this.game.isThreefoldRepetition()) {
      this.status.set('draw');
      this.audioService.playBoardEnd();
      this.stopTimer();
      return true;
    }
    return false;
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.status() !== 'playing') return;

      const turn = this.game.turn();
      if (turn === 'w') {
        this.whiteTimeMs.update((t) => Math.max(0, t - 100));
        if (this.whiteTimeMs() === 0) {
          this.onTimeOut('white');
        }
      } else {
        this.blackTimeMs.update((t) => Math.max(0, t - 100));
        if (this.blackTimeMs() === 0) {
          this.onTimeOut('black');
        }
      }
    }, 100);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private onTimeOut(color: 'white' | 'black') {
    this.status.set('out-of-time');
    this.stopTimer();
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  backToSetup() {
    this.isSetup.set(true);
    this.showResignConfirm.set(false);
    this.stopTimer();
    this.engineService.stop();
  }

  resignGame() {
    if (this.status() !== 'playing') return;
    
    if (!this.showResignConfirm()) {
      this.showResignConfirm.set(true);
      return;
    }
    
    this.showResignConfirm.set(false);
    this.status.set('resigned');
    this.stopTimer();
    this.engineService.stop();
  }

  onNavigate(ply: number) {
    this.displayPly.set(Math.max(0, Math.min(ply, this.pgnMoves().length)));
  }
}

