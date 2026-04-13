import { Component, OnInit, OnDestroy, inject, signal, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chess } from 'chess.js';
import { EngineService } from '../../../core/services/engine.service';
import { ChessBoardComponent } from '../../../shared/components/chess-board/chess-board.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';
import { MoveNotationComponent } from '../../../shared/components/move-notation/move-notation.component';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-computer-play',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChessBoardComponent,
    ButtonComponent,
    BadgeComponent,
    MoveNotationComponent
  ],
  templateUrl: './computer-play.component.html',
})
export class ComputerPlayComponent implements OnInit, OnDestroy {
  private engineService = inject(EngineService);
  private audioService = inject(AudioService);

  @ViewChild(ChessBoardComponent) board!: ChessBoardComponent;

  // Game Setup State
  isSetup = signal(true);
  selectedLevel = signal(1);
  selectedTimeControl = signal<TimeControlOption | null>(null);
  selectedColor = signal<'white' | 'black' | 'random'>('random');

  // Game Play State
  game = new Chess();
  playerColor: 'white' | 'black' = 'white';
  status = signal<'playing' | 'mate' | 'draw' | 'out-of-time'>('playing');
  engineEval = signal<string>('0.0');
  pgnMoves = signal<string[]>([]);
  isEngineThinking = signal(false);

  // Time management signals
  whiteTimeMs = signal(0);
  blackTimeMs = signal(0);
  private timerInterval: any;

  levels = [1, 2, 3, 4, 5, 6, 7, 8];
  timeControls = TIME_CONTROLS;

  ngOnInit() {
    this.engineService.bestMove$.subscribe(move => {
      this.onEngineMove(move);
    });

    this.engineService.evaluation$.subscribe(evalStr => {
      this.engineEval.set(evalStr);
    });
  }

  ngOnDestroy() {
    this.stopTimer();
    this.engineService.stop();
  }

  startGame() {
    // 1. Setup sides
    this.playerColor = this.selectedColor() === 'random' 
      ? (Math.random() > 0.5 ? 'white' : 'black') 
      : (this.selectedColor() as 'white' | 'black');

    // 2. Setup times
    if (this.selectedTimeControl()) {
      const ms = (this.selectedTimeControl()?.baseSeconds || 0) * 1000;
      this.whiteTimeMs.set(ms);
      this.blackTimeMs.set(ms);
    } else {
      // Infinite/Casual mode if no TC
      this.whiteTimeMs.set(3600000); // 1 hour default
      this.blackTimeMs.set(3600000);
    }

    // 3. Prepare Engine
    this.engineService.prepareGame(this.selectedLevel());
    
    // 4. Start
    this.game.reset();
    this.isSetup.set(false);
    this.status.set('playing');
    this.pgnMoves.set([]);
    
    this.startTimer();

    if (this.playerColor === 'black') {
      this.requestEngineMove();
    }
  }

  onUserMove(event: { from: string; to: string; san: string; fen: string }) {
    if (this.status() !== 'playing') return;
    
    // Update local state
    this.game.load(event.fen);
    this.pgnMoves.update(moves => [...moves, event.san]);
    this.isEngineThinking.set(true);

    if (this.checkGameOver()) return;

    // Apply increment if applicable
    const inc = (this.selectedTimeControl()?.incrementSeconds || 0) * 1000;
    if (this.playerColor === 'white') {
        this.whiteTimeMs.update(t => t + inc);
    } else {
        this.blackTimeMs.update(t => t + inc);
    }

    this.requestEngineMove();
  }

  private requestEngineMove() {
    const fen = this.game.fen();
    this.engineService.requestMove(
      fen, 
      this.whiteTimeMs(), 
      this.blackTimeMs(),
      (this.selectedTimeControl()?.incrementSeconds || 0) * 1000,
      (this.selectedTimeControl()?.incrementSeconds || 0) * 1000
    );
  }

  private onEngineMove(move: { from: string; to: string; promotion?: string }) {
    if (this.status() !== 'playing') return;

    try {
      const result = this.game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      });

      if (result) {
        this.audioService.playMoveSound(result.san);
        this.pgnMoves.update(moves => [...moves, result.san]);
        this.isEngineThinking.set(false);
        
        if (this.board) {
          this.board.fen = this.game.fen();
        }

        // Apply engine increment
        const inc = (this.selectedTimeControl()?.incrementSeconds || 0) * 1000;
        if (this.playerColor === 'white') {
            this.blackTimeMs.update(t => t + inc);
        } else {
            this.whiteTimeMs.update(t => t + inc);
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
      this.stopTimer();
      return true;
    }
    if (this.game.isDraw() || this.game.isStalemate() || this.game.isThreefoldRepetition()) {
      this.status.set('draw');
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
        this.whiteTimeMs.update(t => Math.max(0, t - 100));
        if (this.whiteTimeMs() === 0) {
           this.onTimeOut('white');
        }
      } else {
        this.blackTimeMs.update(t => Math.max(0, t - 100));
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

  exitGame() {
    this.isSetup.set(true);
    this.stopTimer();
  }
}
