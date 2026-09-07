import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorldChampionshipMatch } from '../../../../core/models/world-championship.model';

/**
 * Modular Match Summary Drawer Component.
 * 
 * WHY: Modularizes the collapsible historical match context and player duel summary.
 */
@Component({
  selector: 'app-wcc-summary-drawer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm animate-fade-in">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 class="text-xl font-semibold text-slate-900">{{ match().title }}</h2>
          <p class="text-xs text-gray-500 mt-0.5">{{ match().location }} • Format: {{ match().format }}</p>
        </div>

        <div class="flex items-center gap-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span class="text-xs text-gray-500 block uppercase">Defender</span>
            <span class="text-sm font-semibold text-slate-900">{{ match().champion }}</span>
          </div>
          <div class="text-center px-2">
            <span class="text-xs text-gray-500 block uppercase">Score</span>
            <span class="text-base font-bold text-slate-900">{{ match().score }}</span>
          </div>
          <div>
            <span class="text-xs text-gray-500 block uppercase">Challenger</span>
            <span class="text-sm font-semibold text-slate-900">{{ match().challenger }}</span>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Historical Overview</h3>
          <p class="text-sm text-slate-700 leading-relaxed">{{ match().description }}</p>
        </div>
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Match Highlights</h3>
          <ul class="space-y-1 text-sm text-slate-700">
            @for (hl of match().keyHighlights; track hl) {
              <li class="flex items-start gap-2">
                <span class="text-emerald-600 font-bold">•</span>
                <span>{{ hl }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class WccSummaryDrawerComponent {
  match = input.required<WorldChampionshipMatch>();
}
