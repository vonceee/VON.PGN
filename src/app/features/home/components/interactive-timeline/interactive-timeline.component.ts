import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSparkles,
  heroBolt,
  heroCpuChip,
  heroArrowRight,
  heroPlay,
} from '@ng-icons/heroicons/outline';
import { RouterModule } from '@angular/router';

interface TimelinePly {
  id: number;
  moveNotation: string;
  plyNumber: string;
  badge: string;
  badgeColor: string;
  evalCentipawns: string;
  evalPercentage: number;
  title: string;
  commentary: string;
  stockfishDepth: string;
  boardFENPreview?: string;
}

/**
 * Creative Scroll-Driven Move Timeline: "The Anatomy of an Immortal Clash".
 *
 * Demonstrates VON.CHESS study features:
 * - Scroll-bound or interactive move scrubbing through iconic combinations.
 * - Dynamic Stockfish evaluation bar shifting with the moves.
 * - Millisecond cloud engine metrics and tactical annotations.
 */
@Component({
  selector: 'app-interactive-timeline',
  standalone: true,
  imports: [RouterModule, NgIconComponent],
  providers: [
    provideIcons({
      heroSparkles,
      heroBolt,
      heroCpuChip,
      heroArrowRight,
      heroPlay,
    }),
  ],
  template: `
    <section class="interactive-timeline-section py-16 md:py-24 mb-20 md:mb-32 md:pr-20 lg:pr-28">

      <!-- Section Header -->
      <div class="mb-12 max-w-3xl">
        <div
          class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-medium mb-4">
          <ng-icon name="heroSparkles" size="0.95rem"></ng-icon>
          <span>Interactive Study Demonstration</span>
        </div>
        <h2 class="text-3xl md:text-5xl font-light text-slate-900 leading-tight mb-3">
          The Anatomy of an <br class="hidden sm:inline" />
          <span class="font-normal text-blue-600">Immortal Combination</span>
        </h2>
        <p class="text-slate-500 text-sm sm:text-base leading-relaxed">
          Scroll or select moves below to explore how VON.CHESS analyzes deep candidate branches, engine evaluations, and key tactical moments in real time.
        </p>
      </div>

      <!-- Main Interactive Timeline Container -->
      <div
        class="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">

        <!-- Background Ambient Mesh Glow -->
        <div
          class="absolute -top-32 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div
          class="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Top Header Info Bar -->
        <div
          class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ng-icon name="heroBolt" size="1.2rem"></ng-icon>
            </div>
            <div>
              <div class="text-white font-medium text-sm sm:text-base">Kasparov vs. Topalov</div>
              <div class="text-xs text-slate-400">Wijk aan Zee, 1999 • "Kasparov's Immortal"</div>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <span class="px-3 py-1 rounded-full bg-white/10 text-slate-300 font-mono flex items-center gap-1.5 border border-white/5">
              <ng-icon name="heroCpuChip" size="0.95rem" class="text-blue-400"></ng-icon>
              <span>{{ activePly().stockfishDepth }}</span>
            </span>
            <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
              Eval: {{ activePly().evalCentipawns }}
            </span>
          </div>
        </div>

        <!-- Move Step Selector Tabs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 my-8 relative z-10">
          @for (ply of plies; track ply.id) {
            <button
              type="button"
              (click)="selectPly(ply.id)"
              [class]="activePlyId() === ply.id
                ? 'timeline-step-btn flex flex-col p-4 rounded-2xl bg-blue-600 text-white text-left transition-all shadow-lg shadow-blue-600/30 scale-[1.02] border border-blue-400 cursor-pointer'
                : 'timeline-step-btn flex flex-col p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-left transition-all border border-white/5 hover:border-white/20 cursor-pointer'">
              <span class="text-[11px] uppercase tracking-wider opacity-75 font-mono mb-1">{{ ply.plyNumber }}</span>
              <span class="text-lg font-bold font-mono">{{ ply.moveNotation }}</span>
              <span
                class="mt-2 text-[11px] px-2 py-0.5 rounded-full inline-block self-start font-medium"
                [class]="activePlyId() === ply.id ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'">
                {{ ply.badge }}
              </span>
            </button>
          }
        </div>

        <!-- Active Move Deep Dive & Evaluation Showcase -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">

          <!-- Left Details: Tactical Breakdown & Annotation -->
          <div class="lg:col-span-8 flex flex-col justify-between h-full space-y-4">
            <div class="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold uppercase text-blue-400 tracking-wider">Candidate Analysis</span>
                <span class="text-slate-500">•</span>
                <span class="text-xs text-slate-400">{{ activePly().plyNumber }}</span>
              </div>
              <h3 class="text-xl sm:text-2xl font-medium text-white mb-2">
                {{ activePly().title }}
              </h3>
              <p class="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                {{ activePly().commentary }}
              </p>

              <!-- Dynamic Real-Time Evaluation Bar Indicator -->
              <div>
                <div class="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                  <span>Advantage: White</span>
                  <span class="text-emerald-400 font-semibold">{{ activePly().evalCentipawns }}</span>
                </div>
                <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex border border-white/10">
                  <div
                    class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500 ease-out"
                    [style.width.%]="activePly().evalPercentage">
                  </div>
                  <div
                    class="h-full bg-slate-900 transition-all duration-500 ease-out"
                    [style.width.%]="100 - activePly().evalPercentage">
                  </div>
                </div>
              </div>
            </div>

            <!-- Explore Button -->
            <div class="flex flex-wrap items-center gap-3">
              <a routerLink="/study"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 active:scale-95">
                <span>Analyze on study board</span>
                <ng-icon name="heroPlay" size="1rem"></ng-icon>
              </a>
              <span class="text-xs text-slate-400">Step through full move trees in Study Studio</span>
            </div>
          </div>

          <!-- Right: Visual Chess Representation / Graphic Position Card -->
          <div class="lg:col-span-4 flex flex-col justify-center items-center">
            <div
              class="w-full max-w-[300px] rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 border border-white/15 p-4 flex flex-col justify-between shadow-xl">
              <div class="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                <span class="text-blue-400 font-medium">Position Preview</span>
                <span class="text-emerald-400 font-mono">{{ activePly().moveNotation }}</span>
              </div>

              <!-- Graphic 8x8 Board Preview with CBurnett SVG Pieces -->
              <div class="w-full aspect-square rounded-xl overflow-hidden border border-slate-700 grid grid-cols-8 grid-rows-8 shadow-inner my-2">
                <!-- Rank 8 -->
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/bR.svg" alt="bR" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90 flex items-center justify-center" [class]="activePlyId() < 3 ? 'bg-amber-400/30' : ''"><img src="pieces/cburnett/bK.svg" alt="bK" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/bR.svg" alt="bR" class="w-4/5 h-4/5" /></div>

                <!-- Rank 7 -->
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/bQ.svg" alt="bQ" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90 flex items-center justify-center" [class]="activePlyId() >= 2 ? 'bg-blue-500/40 ring-2 ring-blue-400 animate-pulse' : ''">
                  @if (activePlyId() >= 2) {
                    <img src="pieces/cburnett/wR.svg" alt="wR" class="w-4/5 h-4/5" />
                  }
                </div>
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/bB.svg" alt="bB" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>

                <!-- Rank 6 -->
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90" [class]="activePlyId() >= 3 ? 'bg-amber-400/40 ring-2 ring-amber-400' : ''">
                  @if (activePlyId() >= 3) {
                    <img src="pieces/cburnett/bK.svg" alt="bK" class="w-4/5 h-4/5" />
                  }
                </div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90"></div>

                <!-- Rank 5 -->
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>

                <!-- Rank 4 -->
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90 flex items-center justify-center" [class]="activePlyId() === 0 ? 'bg-blue-500/50 ring-2 ring-blue-400 animate-pulse' : activePlyId() === 1 ? 'bg-amber-500/40' : activePlyId() >= 3 ? 'bg-blue-600/40' : ''">
                  @if (activePlyId() === 0) {
                    <img src="pieces/cburnett/wR.svg" alt="wR" class="w-4/5 h-4/5" />
                  } @else if (activePlyId() === 1 || activePlyId() === 2) {
                    <img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" />
                  } @else {
                    <img src="pieces/cburnett/wQ.svg" alt="wQ" class="w-4/5 h-4/5" />
                  }
                </div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>

                <!-- Rank 3 -->
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/wB.svg" alt="wB" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/wQ.svg" alt="wQ" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90"></div>

                <!-- Rank 2 -->
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>

                <!-- Rank 1 -->
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90"></div>
                <div class="bg-slate-600/90"></div>
                <div class="bg-slate-200/90 flex items-center justify-center"><img src="pieces/cburnett/wR.svg" alt="wR" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-600/90 flex items-center justify-center"><img src="pieces/cburnett/wK.svg" alt="wK" class="w-4/5 h-4/5" /></div>
                <div class="bg-slate-200/90"></div>
              </div>

              <div class="text-center mt-1">
                <div class="text-[11px] text-slate-400">Position calculated at Depth 48</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveTimelineComponent {
  public readonly activePlyId = signal<number>(0);

  public readonly plies: TimelinePly[] = [
    {
      id: 0,
      plyNumber: 'Move 24',
      moveNotation: '24. Rxd4!!',
      badge: 'Brilliant !!',
      badgeColor: 'blue',
      evalCentipawns: '+1.85',
      evalPercentage: 68,
      title: 'The Unprecedented Rook Sacrifice',
      commentary:
        'Kasparov sacrifices his rook on d4 out of nowhere. Accepting the rook strips the black king of its defensive pawn fortress and initiates one of the deepest king hunts in classical chess history.',
      stockfishDepth: 'Depth 42 • Cloud',
    },
    {
      id: 1,
      plyNumber: 'Move 24...',
      moveNotation: '24... cxd4',
      badge: 'Forced',
      badgeColor: 'slate',
      evalCentipawns: '+2.40',
      evalPercentage: 74,
      title: 'Topalov Accepts the Invitation',
      commentary:
        'Topalov captures the offering. Declining with 24... Kb8 allows 25. Rd7 with overwhelming positional pressure. White now unleashes the second stage of calculation.',
      stockfishDepth: 'Depth 40 • Cloud',
    },
    {
      id: 2,
      plyNumber: 'Move 25',
      moveNotation: '25. Re7+!!',
      badge: 'Decisive !!',
      badgeColor: 'emerald',
      evalCentipawns: '+4.20',
      evalPercentage: 86,
      title: 'The Second Rook Deflection',
      commentary:
        'Kasparov delivers check by offering his remaining rook. If 25... Qxe7, 26. Qxd4+ Kb8 27. Qb6+ wins immediately. The black king is dragged into open territory on the b-file.',
      stockfishDepth: 'Depth 44 • Cloud',
    },
    {
      id: 3,
      plyNumber: 'Move 25... 26.',
      moveNotation: '25... Kb6 26. Qxd4+',
      badge: 'Checkmate Net',
      badgeColor: 'amber',
      evalCentipawns: '+6.85',
      evalPercentage: 94,
      title: 'The Legendary Cross-Board King Hunt',
      commentary:
        'The black king is flushed out toward White’s own camp (c8 -> b6 -> a5 -> a4). Kasparov calculates a 15-move sequence to force surrender in an immortal masterpiece.',
      stockfishDepth: 'Depth 48 • Cloud',
    },
  ];

  public readonly activePly = signal<TimelinePly>(this.plies[0]);

  public selectPly(id: number): void {
    this.activePlyId.set(id);
    const found = this.plies.find((p) => p.id === id);
    if (found) {
      this.activePly.set(found);
    }
  }

  /**
   * Programmatically advance timeline step driven by scroll scrub.
   */
  public setTimelineProgress(progress: number): void {
    const index = Math.min(
      this.plies.length - 1,
      Math.floor(progress * this.plies.length),
    );
    if (index !== this.activePlyId()) {
      this.selectPly(index);
    }
  }
}
