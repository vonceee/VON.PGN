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
    <section class="storytelling-pillars-section mb-20 md:mb-32 md:pr-20 lg:pr-28">
      <div class="mb-14 text-left max-w-3xl">
        <div
          class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-medium mb-4">
          Architectural depth
        </div>
        <h2 class="text-3xl md:text-5xl font-light text-slate-900 leading-tight mb-4">
          Built for chess players <br />
          <span class="font-normal text-blue-600">for the modern era</span>
        </h2>
        <p class="text-slate-600 text-base leading-relaxed">
          vonchess is designed for deliberate practice and chess improvement—whether you are a master coach organizing
          repertoires, a competitive tournament player sharpening calculation, or a casual enjoyer diving into
          historical games.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div
          class="skew-on-scroll bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-3xl p-7 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
            <ng-icon name="heroBolt" size="1.4rem"></ng-icon>
          </div>
          <div class="text-xs font-semibold text-blue-600 mb-1">01 / CALCULATION</div>
          <h3 class="text-lg font-medium text-slate-900 mb-2">Woodpecker tactical cycles</h3>
          <p class="text-slate-500 text-sm leading-relaxed">
            Repetitive pattern recognition with automatic speed benchmarks and accuracy tracking to turn tactical
            awareness into second nature.
          </p>
        </div>

        <div
          class="skew-on-scroll bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-3xl p-7 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
            <ng-icon name="heroChartBar" size="1.4rem"></ng-icon>
          </div>
          <div class="text-xs font-semibold text-blue-600 mb-1">02 / DEEP EVALUATION</div>
          <h3 class="text-lg font-medium text-slate-900 mb-2">Stockfish neural engine</h3>
          <p class="text-slate-500 text-sm leading-relaxed">
            Instant multi-variation lines, centipawn evaluation charts, and blunder detection operating both locally in
            your browser and via cloud workers.
          </p>
        </div>

        <div
          class="skew-on-scroll bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-3xl p-7 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
            <ng-icon name="heroTrophy" size="1.4rem"></ng-icon>
          </div>
          <div class="text-xs font-semibold text-blue-600 mb-1">03 / COMPETITION</div>
          <h3 class="text-lg font-medium text-slate-900 mb-2">Live Swiss & arena pairings</h3>
          <p class="text-slate-500 text-sm leading-relaxed">
            Host club championships and online arenas with millisecond WebSocket clock synchronization, anti-cheat
            monitoring, and live standings.
          </p>
        </div>

      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorytellingPillarsComponent {}
