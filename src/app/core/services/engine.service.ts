import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';

/**
 * Maps Lichess-style levels (1-8) to Stockfish Skill Levels (0-20)
 */
const LEVEL_MAPPING: Record<number, number> = {
  1: 0,  // Beginner
  2: 3,
  3: 6,
  4: 9,
  5: 12,
  6: 15,
  7: 18,
  8: 20  // Grandmaster
};

@Injectable({
  providedIn: 'root'
})
export class EngineService {
  private platformId = inject(PLATFORM_ID);
  private worker: Worker | null = null;
  
  private bestMoveSubject = new Subject<{ from: string; to: string; promotion?: string }>();
  bestMove$ = this.bestMoveSubject.asObservable();
  
  private evalSubject = new Subject<string>();
  evaluation$ = this.evalSubject.asObservable();

  public isReady = signal(false);
  public isError = signal(false);
  private currentLevel = 1;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Initialize Stockfish worker with the correct path
      this.worker = new Worker('/assets/engine/stockfish.js');
      
      this.worker.onmessage = (e) => {
        const line = e.data;
        this.handleEngineMessage(line);
      };

      // Identify engine and ensure it's ready
      // Set a timeout to detect engine loading failures
      setTimeout(() => {
        if (!this.isReady()) {
          console.error('Engine initialization timeout (8s)');
          this.isError.set(true);
        }
      }, 8000);

      this.sendCommand('uci');
      this.sendCommand('isready');
    } catch (error) {
      console.error('[EngineService] Failed to initialize Stockfish worker:', error);
    }
  }

  private handleEngineMessage(line: string) {
    // UCI Protocol Handlers
    if (line === 'uciok') {
      console.log('[EngineService] Stockfish initialized successfully');
    } else if (line === 'readyok') {
      this.isReady.set(true);
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const moveUci = parts[1];
      if (moveUci && moveUci !== '(none)') {
        this.bestMoveSubject.next({
          from: moveUci.substring(0, 2),
          to: moveUci.substring(2, 4),
          promotion: moveUci.length > 4 ? moveUci.substring(4, 5) : undefined
        });
      }
    } else if (line.startsWith('info')) {
      // Parse evaluation for UI display from info lines
      const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
      if (scoreMatch) {
        const type = scoreMatch[1];
        const value = scoreMatch[2];
        const evalVal = type === 'mate' ? `#${value}` : (parseInt(value) / 100).toFixed(1);
        this.evalSubject.next(evalVal);
      }
    }
  }

  sendCommand(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  prepareGame(level: number) {
    this.currentLevel = level;
    const skill = LEVEL_MAPPING[level] ?? 10;
    // For Phase 1, we use Skill Level for difficulty
    this.sendCommand(`setoption name Skill Level value ${skill}`);
    this.sendCommand('ucinewgame');
    this.sendCommand('isready');
  }

  /**
   * Request a move from the engine.
   */
  requestMove(fen: string, wTime: number, bTime: number, wInc: number, bInc: number) {
    this.sendCommand(`position fen ${fen}`);
    
    // For Level 8, we allow the engine to be fully "time aware" by removing the movetime cap.
    // Stockfish will use the wtime/btime parameters to decide how long to think.
    if (this.currentLevel === 8) {
      this.sendCommand(`go wtime ${wTime} btime ${bTime} winc ${wInc} binc ${bInc}`);
    } else {
      // For Levels 1-7, we keep the movetime cap to ensure snappy, casual responses.
      let moveTimeCap = 3000;
      if (this.currentLevel <= 3) {
        moveTimeCap = 800;
      } else if (this.currentLevel <= 6) {
        moveTimeCap = 2000;
      } else {
        moveTimeCap = 4000;
      }

      this.sendCommand(`go wtime ${wTime} btime ${bTime} winc ${wInc} binc ${bInc} movetime ${moveTimeCap}`);
    }
  }

  stop() {
    this.sendCommand('stop');
  }
}
