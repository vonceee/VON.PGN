import { Injectable, PLATFORM_ID, inject, signal, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { auditTime } from 'rxjs/operators';

/**
 * Maps UI difficulty levels (1-8) to Stockfish search depth limits.
 * Level 8 uses full time-based search instead of a depth cap.
 */
const LEVEL_TO_DEPTH: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 8,
  6: 12,
  7: 16,
  8: 24,
};

export type SearchMode = 'infinite' | 'movetime' | 'depth';

export interface PvLine {
  eval: string;      // "+1.2" or "#3"
  pvIndex: number;    // 0-based PV line index
  pv: string[];       // UCI moves
  depth: number;
  bestMove: string;   // First move of this PV line (UCI)
}

export interface EngineAnalysis {
  eval: string;
  bestMove: string;
  pv: string[];
  fen: string;
  depth: number;
  pvIndex: number;
  nodes: number;
  nps: number;
}

@Injectable({
  providedIn: 'root'
})
export class EngineService {
  private bestMoveSubject = new Subject<{ from: string; to: string; promotion?: string }>();
  bestMove$ = this.bestMoveSubject.asObservable();
  
  private rawEvaluation$ = new Subject<string>();
  evaluation$: Observable<string> = this.rawEvaluation$.pipe(auditTime(250));
  
  private rawAnalysis$ = new Subject<EngineAnalysis>();
  analysis$: Observable<EngineAnalysis> = this.rawAnalysis$.pipe(auditTime(250));

  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private worker: Worker | null = null;
  private currentLevel = 1;
  private commandQueue: string[] = [];
  private initTimeout: ReturnType<typeof setTimeout> | null = null;
  private isSessionStarted = false;
  private lastFenSent = '';
  private evalCache = new Map<string, { eval: string; bestMove: string; pv: string[]; depth: number }>();

  // --- Analysis Settings (exposed as signals for UI binding) ---
  multiPv = signal(1);           // 1, 2, or 3
  searchMode = signal<SearchMode>('movetime');
  searchValue = signal(8000);    // movetime in ms or depth level
  
  isReady = signal(false);
  isError = signal(false);

  // --- Aggregated multi-PV state ---
  pvLines = signal<PvLine[]>([]);
  engineDepth = signal(0);
  engineNodes = signal(0);
  engineNps = signal(0);
  
  // Tracks in-progress PV lines for current position (collects across multipv indices)
  private currentPvAccumulator = new Map<number, PvLine>();
  private currentAnalysisFen = '';

  constructor() {
    // Intentionally empty — worker is lazily initialized on first use.
  }

  private initWorker() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      try {
        // Use relative path for better compatibility with base href
        this.worker = new Worker('assets/engine/stockfish.js');
        
        this.worker.onmessage = (e) => {
          this.handleEngineMessage(e.data);
        };

        this.worker.onerror = (err) => {
          this.ngZone.run(() => {
            console.error('[EngineService] Worker Error:', err);
            this.isError.set(true);
          });
        };

        // Stockfish WASM can take a while to compile + initialize.
        // If it hasn't responded within 20s, surface an error to the UI.
        this.initTimeout = setTimeout(() => {
          if (!this.isReady()) {
            this.ngZone.run(() => {
              console.error('[EngineService] Stockfish initialization timeout (20s)');
              this.isError.set(true);
            });
          }
        }, 20_000);

        // Start the handshake
        this.sendCommand('uci');
      } catch (e) {
        this.ngZone.run(() => {
          console.error('[EngineService] Failed to start worker:', e);
          this.isError.set(true);
        });
      }
    });
  }

  private handleEngineMessage(rawMessage: string) {
    // Uncomment for UCI wire debugging:
    // console.log(`[Engine] ${rawMessage}`);
    
    const lines = rawMessage.split('\n');
    
    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line === 'uciok') {
        if (this.initTimeout) clearTimeout(this.initTimeout);
        this.sendCommand('isready');
      } else if (line === 'readyok') {
        this.ngZone.run(() => {
          // Internal state update for barrier
          this.isReady.set(true);
          this.isError.set(false);
          // Small delay to ensure internal state is propagated before flushing
          setTimeout(() => this.flushQueue(), 50);
        });
      } else if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const moveUci = parts[1];
        if (moveUci && moveUci !== '(none)') {
          this.bestMoveSubject.next({
            from: moveUci.substring(0, 2),
            to: moveUci.substring(2, 4),
            promotion: moveUci.length > 4 ? moveUci.substring(4, 5) : undefined,
          });
        }
      } else if (line.startsWith('info')) {
        this.parseInfoLine(line);
      }
    }
  }

  /**
   * Parses a UCI "info" line, extracting depth, multipv, score, pv, nodes, nps.
   */
  private parseInfoLine(line: string) {
    // Skip info strings (e.g., "info string variant chess startpos ...")
    if (line.includes('info string')) return;

    const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
    const pvMatch = line.match(/ pv (.+)/);
    const depthMatch = line.match(/ depth (\d+)/);
    const multipvMatch = line.match(/ multipv (\d+)/);
    const nodesMatch = line.match(/ nodes (\d+)/);
    const npsMatch = line.match(/ nps (\d+)/);

    if (!scoreMatch) return;

    const type = scoreMatch[1];
    const value = scoreMatch[2];
    const evalVal = type === 'mate' ? `#${value}` : (parseInt(value) / 100).toFixed(1);
    const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
    const pvIndex = multipvMatch ? parseInt(multipvMatch[1]) - 1 : 0; // UCI multipv is 1-based
    const nodes = nodesMatch ? parseInt(nodesMatch[1]) : 0;
    const nps = npsMatch ? parseInt(npsMatch[1]) : 0;

    if (pvMatch) {
      const pvString = pvMatch[1];
      const pvArray = pvString.split(' ');
      const bestMove = pvArray[0];

      const analysis: EngineAnalysis = {
        eval: evalVal,
        bestMove,
        pv: pvArray,
        fen: this.lastFenSent,
        depth,
        pvIndex,
        nodes,
        nps,
      };

      // Update the eval cache (always track best line = pvIndex 0)
      if (pvIndex === 0) {
        this.evalCache.set(this.lastFenSent, { eval: evalVal, bestMove, pv: pvArray, depth });
      }

      // Accumulate multi-PV lines for current position
      if (this.lastFenSent !== this.currentAnalysisFen) {
        this.currentPvAccumulator.clear();
        this.currentAnalysisFen = this.lastFenSent;
      }

      this.currentPvAccumulator.set(pvIndex, {
        eval: evalVal,
        pvIndex,
        pv: pvArray,
        depth,
        bestMove,
      });

      // Emit the aggregated PV lines and stats (outside Angular zone for performance)
      const aggregated = Array.from(this.currentPvAccumulator.values())
        .sort((a, b) => a.pvIndex - b.pvIndex);

      // Only update signals when we have data for PV line 0 (main line)
      if (pvIndex === 0) {
        this.engineDepth.set(depth);
        this.engineNodes.set(nodes);
        this.engineNps.set(nps);
      }
      this.pvLines.set(aggregated);

      // Emit on the observable for the study component's subscription 
      this.rawAnalysis$.next(analysis);
    }

    this.rawEvaluation$.next(evalVal);
  }

  sendCommand(command: string) {
    if (!this.worker) {
      if (command === 'stop') return; // Don't wake up just to stop
      this.initWorker();
    }

    if (!this.isReady() && !['uci', 'isready'].includes(command)) {
      this.commandQueue.push(command);
      return;
    }

    if (this.worker) {
      
      if (command.startsWith('position fen ')) {
        this.lastFenSent = command.substring(13);
      }
      
      // Barrier: Only 'isready' should establish a barrier, because only
      // 'isready' triggers a 'readyok' response from the engine.
      // 'ucinewgame' does NOT produce any response, so we must NOT set
      // a barrier on it — otherwise the queue will be stuck forever.
      if (command === 'isready') {
        this.isReady.set(false);
      }

      this.worker.postMessage(command);
    }
  }

  private flushQueue() {
    // We copy the queue and clear the original before processing
    // to prevent infinite recursion if a command (like isready) triggers a re-queue.
    const queue = [...this.commandQueue];
    this.commandQueue = [];
    
    queue.forEach(cmd => {
      this.sendCommand(cmd);
    });
  }

  /**
   * Prepares the engine for a new game at the given difficulty level.
   * Used by the "Play vs Computer" feature.
   */
  prepareGame(level: number) {
    this.currentLevel = level;
    this.sendCommand('ucinewgame');
    this.sendCommand('isready');
  }

  /**
   * Requests a move from the engine for the "Play vs Computer" feature.
   * Levels 1-7 use depth-limited search; level 8 uses full time-based search.
   */
  requestMove(fen: string, wTime: number, bTime: number, wInc: number, bInc: number) {
    this.sendCommand(`position fen ${fen}`);

    if (this.currentLevel === 8) {
      this.sendCommand(`go wtime ${wTime} btime ${bTime} winc ${wInc} binc ${bInc}`);
    } else {
      const depth = LEVEL_TO_DEPTH[this.currentLevel] ?? 1;
      this.sendCommand(`go depth ${depth}`);
    }
  }

  /**
   * Starts engine analysis for a given position.
   * Respects the current multiPv, searchMode, and searchValue settings.
   */
  startAnalysis(fen: string) {
    
    this.stop();
    
    // Clear accumulator for the new position
    this.currentPvAccumulator.clear();
    this.currentAnalysisFen = fen;
    
    if (!this.isSessionStarted) {
      this.sendCommand('ucinewgame');
      this.sendCommand('isready');
      this.isSessionStarted = true;
    }

    // Set Multi-PV option
    this.sendCommand(`setoption name MultiPV value ${this.multiPv()}`);
    
    this.sendCommand(`position fen ${fen}`);

    // Choose go command based on search mode
    const mode = this.searchMode();
    const value = this.searchValue();

    switch (mode) {
      case 'movetime':
        this.sendCommand(`go movetime ${value}`);
        break;
      case 'depth':
        this.sendCommand(`go depth ${value}`);
        break;
      case 'infinite':
      default:
        this.sendCommand('go infinite');
        break;
    }
  }

  stop() {
    if (this.worker) {
      this.sendCommand('stop');
    }
  }

  /**
   * Forces the engine into infinite analysis mode for deeper search.
   * Used when the user clicks "Go Deeper" to override a movetime/depth cap.
   */
  goDeeper() {
    if (!this.lastFenSent) return;
    
    this.stop();
    this.sendCommand(`setoption name MultiPV value ${this.multiPv()}`);
    this.sendCommand(`position fen ${this.lastFenSent}`);
    this.sendCommand('go infinite');
  }

  /**
   * Updates the multi-PV setting. Restarts analysis if currently active.
   */
  setMultiPv(count: number) {
    const clamped = Math.max(1, Math.min(3, count));
    this.multiPv.set(clamped);
    // Clear accumulator since PV count changed
    this.currentPvAccumulator.clear();
  }

  /**
   * Updates the search mode and value.
   */
  setSearchMode(mode: SearchMode, value?: number) {
    this.searchMode.set(mode);
    if (value !== undefined) {
      this.searchValue.set(value);
    }
  }

  /**
   * Restarts the engine worker (useful for error recovery)
   */
  restart() {
    this.terminate();
    this.isError.set(false);
    this.initWorker();
  }

  /**
   * Properly shuts down the worker
   */
  terminate() {
    if (this.worker) {
      try {
        this.sendCommand('quit');
        this.worker.terminate();
      } catch {
        // Worker may already be dead — safe to ignore.
      }
      this.worker = null;
      this.isReady.set(false);
      this.isSessionStarted = false;
    }
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
  }

  /**
   * Retrieves a cached evaluation if available.
   */
  getCachedAnalysis(fen: string) {
    return this.evalCache.get(fen);
  }

  /**
   * Clears the evaluation cache (e.g., when engine settings change)
   */
  clearCache() {
    this.evalCache.clear();
  }
}
