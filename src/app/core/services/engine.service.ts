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

  isReady = signal(false);

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Initialize Stockfish worker
      // Path assumes the files are in public/assets/engine/
      this.worker = new Worker('/assets/engine/stockfish-nnue-16.js');
      
      this.worker.onmessage = (e) => {
        const line = e.data;
        this.handleEngineMessage(line);
      };

      this.sendCommand('uci');
    } catch (error) {
      console.error('[EngineService] Failed to initialize Stockfish worker:', error);
    }
  }

  private handleEngineMessage(line: string) {
    if (line === 'uciok') {
      this.isReady.set(true);
      this.sendCommand('setoption name Use NNUE value true');
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const moveUci = parts[1];
      if (moveUci) {
        this.bestMoveSubject.next({
          from: moveUci.substring(0, 2),
          to: moveUci.substring(2, 4),
          promotion: moveUci.length > 4 ? moveUci.substring(4, 5) : undefined
        });
      }
    } else if (line.startsWith('info depth')) {
      // Parse evaluation for UI display
      const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
      if (scoreMatch) {
        const type = scoreMatch[1];
        const value = scoreMatch[2];
        this.evalSubject.next(type === 'mate' ? `#${value}` : (parseInt(value) / 100).toFixed(1));
      }
    }
  }

  sendCommand(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  prepareGame(level: number) {
    const skill = LEVEL_MAPPING[level] ?? 10;
    this.sendCommand(`setoption name Skill Level value ${skill}`);
    this.sendCommand('ucinewgame');
  }

  /**
   * Request a move from the engine.
   * Uses wtime/btime to make the engine respect the clock.
   */
  requestMove(fen: string, wTime: number, bTime: number, wInc: number, bInc: number) {
    this.sendCommand(`position fen ${fen}`);
    // Use slightly less time than available to account for overhead
    this.sendCommand(`go wtime ${wTime} btime ${bTime} winc ${wInc} binc ${bInc}`);
  }

  stop() {
    this.sendCommand('stop');
  }
}
