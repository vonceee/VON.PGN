import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroVideoCamera,
  heroTrophy,
  heroGlobeAlt,
  heroEye,
  heroArrowRight,
  heroPlay,
} from '@ng-icons/heroicons/outline';

/**
 * Broadcast & Live Tournament Arena Showcase.
 * Inspired by live grandmaster broadcasts, featuring synced multi-board views and real-time evaluation.
 */
@Component({
  selector: 'app-broadcast-showcase',
  standalone: true,
  imports: [RouterModule, NgIconComponent],
  providers: [
    provideIcons({
      heroVideoCamera,
      heroTrophy,
      heroGlobeAlt,
      heroEye,
      heroArrowRight,
      heroPlay,
    }),
  ],
  template: `
    <section class="broadcast-showcase-section py-10 md:py-16">

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

        <!-- Left Column: Copy & Value Propositions -->
        <div class="lg:col-span-6">
          <p class="font-mono text-[11px] sm:text-xs text-slate-400 select-none mb-1.5">text-5xl text-slate-950 tracking-tight font-semibold</p>

          <h2 class="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-950 leading-tight mb-4">
            Follow the Best in <br class="hidden sm:inline" />
            <span class="font-semibold text-blue-600">World Chess Live</span>
          </h2>

          <p class="text-slate-600 text-base leading-relaxed mb-8">
            Experience world championship crown matches, Candidates tournaments, and super-GM arenas with millisecond move sync, cloud engine evaluations, and interactive move exploration.
          </p>

          <!-- Feature Highlights List -->
          <div class="space-y-4 mb-8">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <ng-icon name="heroTrophy" size="1.1rem"></ng-icon>
              </div>
              <div>
                <h3 class="text-sm font-medium text-slate-900">Official Classical Championship Archives</h3>
                <p class="text-xs text-slate-500">Relive every game from Steinitz 1886 to Ding vs Gukesh 2024 with full move trees.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <ng-icon name="heroGlobeAlt" size="1.1rem"></ng-icon>
              </div>
              <div>
                <h3 class="text-sm font-medium text-slate-900">Millisecond WebSocket Clock Synchronization</h3>
                <p class="text-xs text-slate-500">Sub-second move broadcasts synced directly with tournament DGT electronic boards.</p>
              </div>
            </div>
          </div>

          <!-- CTAs -->
          <div class="flex flex-wrap items-center gap-3">
            <a routerLink="/world-championships"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-medium text-[15px] hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 active:scale-95">
              <span>Explore championships</span>
              <ng-icon name="heroTrophy" size="1rem"></ng-icon>
            </a>
            <a routerLink="/events"
              class="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 border border-slate-200 text-slate-800 font-medium text-[15px] hover:bg-slate-100 transition-all active:scale-95">
              <span>View live events</span>
              <ng-icon name="heroEye" size="1rem" class="text-slate-500"></ng-icon>
            </a>
          </div>
        </div>

        <!-- Right Column: Broadcast Player Studio Mockup -->
        <div class="lg:col-span-6">
          <div
            class="bg-slate-900 border border-white/15 rounded-3xl p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden">

            <!-- Top Broadcast Header -->
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span class="text-xs font-semibold uppercase tracking-wider text-red-400">Broadcast • Round 7</span>
              </div>
              <span class="text-xs font-mono text-slate-400">FIDE World Championship</span>
            </div>

            <!-- Player 1 (Black: Magnus Carlsen) -->
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 mb-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl overflow-hidden border border-white/20 shrink-0">
                  <img
                    src="assets/player-profiles/magnus-carlsen.webp"
                    alt="GM Magnus Carlsen"
                    class="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-medium text-white">GM Carlsen, Magnus</span>
                    <span class="text-xs">🇳🇴</span>
                  </div>
                  <div class="text-[11px] text-slate-400">2832 FIDE • Black</div>
                </div>
              </div>
              <div class="text-base font-mono font-bold bg-slate-800 px-3.5 py-1.5 rounded-xl text-white border border-white/5">
                04:12
              </div>
            </div>

            <!-- Authentic Graphic 8x8 Chess Board with Real SVG Pieces & Eval Bar -->
            <div class="relative rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 p-4 border border-white/10 my-3">
              <div class="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>Move 28: <strong class="text-white">28. Qh5!</strong></span>
                <span class="text-emerald-400 font-mono font-medium">+1.45 (Stockfish 17 • Depth 42)</span>
              </div>

              <div class="flex items-center justify-center gap-2">
                <!-- Vertical Evaluation Bar -->
                <div class="w-2.5 h-64 sm:h-72 bg-slate-900 rounded-full overflow-hidden flex flex-col justify-end border border-white/10 shrink-0">
                  <div class="w-full bg-white transition-all duration-500 rounded-b-full" style="height: 64%;"></div>
                </div>

                <!-- 8x8 Board Graphic with SVG Pieces -->
                <div class="w-64 sm:w-72 aspect-square rounded-xl overflow-hidden border-2 border-slate-700 grid grid-cols-8 grid-rows-8 shadow-xl relative">
                  <!-- Rank 8 -->
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bR.svg" alt="bR" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/bQ.svg" alt="bQ" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/bR.svg" alt="bR" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bK.svg" alt="bK" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>

                  <!-- Rank 7 -->
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bB.svg" alt="bB" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>

                  <!-- Rank 6 -->
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/bN.svg" alt="bN" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>

                  <!-- Rank 5 -->
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/bP.svg" alt="bP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center bg-blue-400/40 ring-2 ring-blue-400"><img src="pieces/cburnett/wQ.svg" alt="wQ" class="w-4/5 h-4/5" /></div>

                  <!-- Rank 4 -->
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>

                  <!-- Rank 3 -->
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/wN.svg" alt="wN" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/wB.svg" alt="wB" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/wN.svg" alt="wN" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>

                  <!-- Rank 2 -->
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/wP.svg" alt="wP" class="w-4/5 h-4/5" /></div>

                  <!-- Rank 1 -->
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/wR.svg" alt="wR" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50"></div>
                  <div class="bg-amber-800/80"></div>
                  <div class="bg-amber-50 flex items-center justify-center"><img src="pieces/cburnett/wR.svg" alt="wR" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-800/80 flex items-center justify-center"><img src="pieces/cburnett/wK.svg" alt="wK" class="w-4/5 h-4/5" /></div>
                  <div class="bg-amber-50"></div>
                </div>
              </div>
            </div>

            <!-- Player 2 (White: Hikaru Nakamura) -->
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 mt-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl overflow-hidden border border-white/20 shrink-0">
                  <img
                    src="assets/player-profiles/hikaru-nakamura.webp"
                    alt="GM Hikaru Nakamura"
                    class="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-medium text-white">GM Nakamura, Hikaru</span>
                    <span class="text-xs">🇺🇸</span>
                  </div>
                  <div class="text-[11px] text-slate-400">2802 FIDE • White</div>
                </div>
              </div>
              <div class="text-base font-mono font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3.5 py-1.5 rounded-xl">
                06:45
              </div>
            </div>

          </div>
        </div>

      </div>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BroadcastShowcaseComponent {}
