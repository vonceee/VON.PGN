import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Dual-Direction Asymmetric Columns Gallery.
 * Column 1 drifts upward, Column 2 drifts in reverse/asymmetrically on scroll.
 */
@Component({
  selector: 'app-asymmetric-gallery',
  standalone: true,
  template: `
    <section id="gallerySection" class="asymmetric-gallery-section py-12 md:py-20 mb-20 md:mb-32 md:pr-20 lg:pr-28 overflow-hidden">

      <div class="mb-14 max-w-2xl">
        <div
          class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-medium mb-3">
          Asymmetric visual gallery
        </div>
        <h2 class="text-3xl md:text-4xl font-light text-slate-900 leading-tight">Platform in motion</h2>
        <p class="text-slate-500 text-sm mt-1">Dual-directional scroll inertia revealing core study workflows</p>
      </div>

      <!-- Asymmetric 2-Column Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        <!-- Left Column (Drifts Upward via GSAP) -->
        <div class="gallery-col-left flex flex-col gap-8 will-change-transform">

          <!-- Gallery Card 1: Repertoire Tree -->
          <div
            class="skew-on-scroll bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs hover:border-slate-300 transition-all">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase text-blue-600">Repertoire Engine</span>
              <span class="text-xs text-slate-400">01</span>
            </div>
            <h3 class="text-xl font-medium text-slate-900 mb-2">Deep branching tree visualization</h3>
            <p class="text-slate-500 text-sm leading-relaxed mb-6">
              Track win percentages, candidate moves, and transposition tables at every ply of your repertoire.
            </p>
            <div
              class="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4 flex flex-col justify-between text-white border border-slate-800">
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>1. e4 c5 2. Nf3 d6 3. d4 cxd4</span>
                <span class="text-emerald-400">+0.32</span>
              </div>
              <div class="space-y-2">
                <div class="h-2 w-3/4 bg-blue-500/40 rounded-full"></div>
                <div class="h-2 w-1/2 bg-blue-400/30 rounded-full"></div>
                <div class="h-2 w-5/6 bg-blue-300/20 rounded-full"></div>
              </div>
              <div class="text-[11px] text-slate-400">Stockfish 17 • 38 Depth</div>
            </div>
          </div>

          <!-- Gallery Card 2: Arena Pairings -->
          <div
            class="skew-on-scroll bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs hover:border-slate-300 transition-all">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase text-blue-600">Live Tournaments</span>
              <span class="text-xs text-slate-400">02</span>
            </div>
            <h3 class="text-xl font-medium text-slate-900 mb-2">Instant Swiss pairings</h3>
            <p class="text-slate-500 text-sm leading-relaxed mb-6">
              Real-time tiebreak recalculations, Sonneborn-Berger scores, and broadcast board sync.
            </p>
            <div
              class="w-full h-40 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Board 1 • Round 5</span>
                <span class="text-blue-600 font-semibold">Live</span>
              </div>
              <div class="flex items-center justify-between py-2 border-y border-slate-200 text-sm">
                <div class="flex items-center gap-2">
                  <img src="assets/player-profiles/magnus-carlsen.webp" alt="Carlsen" class="w-6 h-6 rounded-full object-cover object-top border border-slate-300" />
                  <span class="font-medium text-slate-800">GM Carlsen, M.</span>
                </div>
                <span class="text-xs font-mono text-slate-500 font-bold">1 - 0</span>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-slate-800">GM Nakamura, H.</span>
                  <img src="assets/player-profiles/hikaru-nakamura.webp" alt="Nakamura" class="w-6 h-6 rounded-full object-cover object-top border border-slate-300" />
                </div>
              </div>
              <div class="text-[11px] text-slate-500">FIDE Rated Online Arena</div>
            </div>
          </div>

        </div>

        <!-- Right Column (Drifts in Reverse via GSAP) -->
        <div class="gallery-col-right flex flex-col gap-8 will-change-transform md:mt-12">

          <!-- Gallery Card 3: Tactical Puzzle Cycles -->
          <div
            class="skew-on-scroll bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs hover:border-slate-300 transition-all">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase text-blue-600">Pattern Memory</span>
              <span class="text-xs text-slate-400">03</span>
            </div>
            <h3 class="text-xl font-medium text-slate-900 mb-2">Woodpecker speed solver</h3>
            <p class="text-slate-500 text-sm leading-relaxed mb-6">
              Spaced repetition cycles training tactical intuition until candidate patterns trigger unconsciously.
            </p>
            <div
              class="w-full h-44 rounded-2xl bg-gradient-to-tr from-blue-900 via-indigo-900 to-slate-900 p-4 flex flex-col justify-between text-white border border-blue-900">
              <div class="flex items-center justify-between text-xs">
                <span class="text-blue-300 font-mono">Cycle 3 / Set A</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px]">98.2% Accuracy</span>
              </div>
              <div class="text-2xl font-light font-mono text-center my-1">00:14.3</div>
              <div class="flex items-center justify-between text-[11px] text-slate-300">
                <span>124 Puzzles Completed</span>
                <span class="text-blue-400">Target: 00:12.0</span>
              </div>
            </div>
          </div>

          <!-- Gallery Card 4: Historical Clashes -->
          <div
            class="skew-on-scroll bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs hover:border-slate-300 transition-all">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase text-blue-600">Classic Archives</span>
              <span class="text-xs text-slate-400">04</span>
            </div>
            <h3 class="text-xl font-medium text-slate-900 mb-2">Historical match archive</h3>
            <p class="text-slate-500 text-sm leading-relaxed mb-6">
              Step through classical title bouts from Steinitz to Ding with full historical context.
            </p>
            <div
              class="w-full rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl overflow-hidden border border-slate-300 shrink-0">
                <img src="assets/player-profiles/robert-james-fischer.webp" alt="Bobby Fischer" class="w-full h-full object-cover object-top" />
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>Reykjavik 1972</span>
                  <span class="text-slate-500">Game 6</span>
                </div>
                <div class="text-xs font-light italic text-slate-700 my-1 line-clamp-2">
                  "Spassky joined the audience in applauding Fischer's brilliancy."
                </div>
                <div class="text-[11px] text-blue-600 font-medium">Queen's Gambit Declined • Tartakower</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsymmetricGalleryComponent {}
