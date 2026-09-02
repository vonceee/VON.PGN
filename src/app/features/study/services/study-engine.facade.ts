import { Injectable, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chess } from 'chess.js';

import { EngineService } from '../../../core/services/engine.service';
import { StudyService } from '../../../core/services/study.service';
import { StudyNavigationFacade } from './study-navigation.facade';

@Injectable({
  providedIn: 'root',
})
export class StudyEngineFacade {
  private engineService = inject(EngineService);
  private studyService = inject(StudyService);
  private nav = inject(StudyNavigationFacade);
  private platformId = inject(PLATFORM_ID);

  // States
  isEngineActive = signal(false);

  // Delegates
  engineDepth = this.engineService.engineDepth;
  engineNodes = this.engineService.engineNodes;
  engineNps = this.engineService.engineNps;
  isEngineError = this.engineService.isError;
  pvLines = this.engineService.pvLines;
  multiPv = this.engineService.multiPv;
  searchMode = this.engineService.searchMode;

  formattedPvLines = computed(() => {
    const lines = this.pvLines();
    const fen = this.nav.currentFen();
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
          // Fallback to raw UCI in case of parsing/move error
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

  formattedNps = computed(() => {
    const nps = this.engineNps();
    if (nps >= 1_000_000) return `${(nps / 1_000_000).toFixed(1)}M nps`;
    if (nps >= 1_000) return `${(nps / 1_000).toFixed(0)}k nps`;
    return nps > 0 ? `${nps} nps` : '';
  });

  engineEval = computed(() => {
    const lines = this.pvLines();
    return lines.length > 0 ? lines[0].eval : null;
  });

  isEngineVisible = computed(() => {
    const s = this.studyService.currentStudy();
    if (!s) return false;
    if (s.engine_visibility === 'owner') {
      return this.studyService.isOwner();
    }
    return true;
  });

  constructor() {
    this.setupEffects();
  }

  private setupEffects() {
    effect(() => {
      const active = this.isEngineActive();
      const fen = this.nav.currentFen();
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

  cleanup() {
    this.engineService.terminate();
  }
}
