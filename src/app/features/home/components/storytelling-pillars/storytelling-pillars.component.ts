import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroBolt,
  heroChartBar,
  heroTrophy,
} from '@ng-icons/heroicons/outline';

/**
 * 3 Architectural Depth Pillars: Calculation, Deep Evaluation, and Competition.
 */
@Component({
  selector: 'app-storytelling-pillars',
  standalone: true,
  imports: [NgIconComponent],
  providers: [
    provideIcons({
      heroBolt,
      heroChartBar,
      heroTrophy,
    }),
  ],
  template: `
    <section class="storytelling-pillars-section py-10 md:py-16">
      <!-- Section Header -->
      <div class="mb-10 text-left max-w-3xl pb-6 border-b border-slate-200/80">
        <p class="font-mono text-[11px] sm:text-xs text-slate-400 select-none mb-1.5">text-5xl text-slate-950 tracking-tight font-semibold</p>
        <h2 class="text-3xl md:text-5xl font-semibold tracking-tight text-slate-950 leading-tight mb-4">
          Built for chess players <br />
          <span class="font-semibold text-blue-600">for the modern era</span>
        </h2>
        <p class="text-slate-600 text-base leading-relaxed">
          vonchess is designed for deliberate practice and chess improvement—whether you are a master coach organizing
          repertoires, a competitive tournament player sharpening calculation, or a casual enjoyer diving into
          historical games.
        </p>
      </div>

      <!-- Structural 3-Column Grid Frame with 1:1 Dividing Lines -->
      <div class="grid grid-cols-1 md:grid-cols-3 border border-slate-200/90 rounded-3xl bg-white/70 backdrop-blur-md overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200/90 shadow-xs relative">

        <div class="skew-on-scroll p-7 lg:p-8 flex flex-col justify-between hover:bg-slate-50/60 transition-colors">
          <div>
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <ng-icon name="heroBolt" size="1.4rem"></ng-icon>
            </div>
            <div class="text-xs font-mono font-semibold text-blue-600 mb-1">01 // CALCULATION</div>
            <h3 class="text-lg font-medium text-slate-900 mb-2">Woodpecker tactical cycles</h3>
            <p class="text-slate-500 text-sm leading-relaxed">
              Repetitive pattern recognition with automatic speed benchmarks and accuracy tracking to turn tactical
              awareness into second nature.
            </p>
          </div>
        </div>

        <div class="skew-on-scroll p-7 lg:p-8 flex flex-col justify-between hover:bg-slate-50/60 transition-colors">
          <div>
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <ng-icon name="heroChartBar" size="1.4rem"></ng-icon>
            </div>
            <div class="text-xs font-mono font-semibold text-blue-600 mb-1">02 // DEEP EVALUATION</div>
            <h3 class="text-lg font-medium text-slate-900 mb-2">Stockfish neural engine</h3>
            <p class="text-slate-500 text-sm leading-relaxed">
              Instant multi-variation lines, centipawn evaluation charts, and blunder detection operating both locally in
              your browser and via cloud workers.
            </p>
          </div>
        </div>

        <div class="skew-on-scroll p-7 lg:p-8 flex flex-col justify-between hover:bg-slate-50/60 transition-colors">
          <div>
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <ng-icon name="heroTrophy" size="1.4rem"></ng-icon>
            </div>
            <div class="text-xs font-mono font-semibold text-blue-600 mb-1">03 // COMPETITION</div>
            <h3 class="text-lg font-medium text-slate-900 mb-2">Live Swiss & arena pairings</h3>
            <p class="text-slate-500 text-sm leading-relaxed">
              Host club championships and online arenas with millisecond WebSocket clock synchronization, anti-cheat
              monitoring, and live standings.
            </p>
          </div>
        </div>

      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorytellingPillarsComponent {}
