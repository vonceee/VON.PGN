import {
  Component,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  inject,
  input,
  signal,
  computed,
  effect,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Chess } from 'chess.js';
import { EngineService } from '../../../../core/services/engine.service';
import { StudyAnalysisComponent } from '../../../study/study-analysis/study-analysis.component';

/**
 * TacticsAnalysisComponent
 * 
 * Encapsulates Stockfish engine evaluation and PV line formatting
 * for completed puzzles or review mode.
 */
@Component({
  selector: 'app-tactics-analysis',
  standalone: true,
  imports: [CommonModule, StudyAnalysisComponent],
  templateUrl: './tactics-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticsAnalysisComponent implements OnDestroy {
  fen = input.required<string>();
  currentPly = input<number>(0);
  status = input<'playing' | 'success' | 'failed'>('playing');
  fenError = input<string | null>(null);

  engineService = inject(EngineService);
  private platformId = inject(PLATFORM_ID);

  isEngineActive = signal(false);
  pvLines = this.engineService.pvLines;
  isEngineError = this.engineService.isError;
  engineNps = this.engineService.engineNps;

  formattedPvLines = computed(() => {
    const lines = this.pvLines();
    const fen = this.fen();
    if (lines.length === 0 || !fen) return [];

    return lines.map((line) => {
      const chess = new Chess(fen);
      const moves: {
        san: string;
        uci: string;
        moveNumber: number;
        showMoveNumber: boolean;
        isBlack: boolean;
      }[] = [];

      for (let i = 0; i < line.pv.length; i++) {
        const uci = line.pv[i];
        const currentTurn = chess.turn();
        const currentMoveNumber = chess.moveNumber();
        const showMoveNumber = i === 0 || currentTurn === 'w';
        const isBlack = i === 0 && currentTurn === 'b';

        try {
          const from = uci.substring(0, 2);
          const to = uci.substring(2, 4);
          const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;
          const result = chess.move({ from, to, promotion });
          moves.push({
            san: result.san,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        } catch (e) {
          moves.push({
            san: uci,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        }
      }

      return {
        ...line,
        moves,
      };
    });
  });

  engineEval = computed(() => {
    const lines = this.pvLines();
    return lines.length > 0 ? lines[0].eval : null;
  });

  formattedNps = computed(() => {
    const nps = this.engineNps();
    if (nps >= 1_000_000) return `${(nps / 1_000_000).toFixed(1)}M nps`;
    if (nps >= 1_000) return `${(nps / 1_000).toFixed(0)}k nps`;
    return nps > 0 ? `${nps} nps` : '';
  });

  constructor() {
    effect(() => {
      const active = this.isEngineActive();
      const fen = this.fen();
      const isBrowser = isPlatformBrowser(this.platformId);

      if (isBrowser) {
        if (active && fen) {
          this.engineService.startAnalysis(fen);
        } else {
          this.engineService.stop();
        }
      }
    });
  }

  toggleEngine() {
    this.isEngineActive.update((active) => !active);
  }

  resetEngine() {
    this.isEngineActive.set(false);
    this.engineService.stop();
  }

  ngOnDestroy() {
    this.engineService.terminate();
  }
}
