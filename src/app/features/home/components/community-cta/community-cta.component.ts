import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroPlay,
  heroCheck,
  heroTrophy,
} from '@ng-icons/heroicons/outline';

/**
 * Community Call to Action Footer Banner.
 * High-conversion invitation to start studying and training.
 */
@Component({
  selector: 'app-community-cta',
  standalone: true,
  imports: [RouterModule, NgIconComponent],
  providers: [
    provideIcons({
      heroPlay,
      heroCheck,
      heroTrophy,
    }),
  ],
  template: `
    <section class="community-cta-section py-10 md:py-16">
      <div
        class="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-4xl p-8 sm:p-12 md:p-16 border border-white/10 shadow-2xl relative overflow-hidden text-center max-w-5xl mx-auto">

        <!-- Background Ambient Glow Accents -->
        <div
          class="absolute -top-28 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl pointer-events-none"></div>
        <div
          class="absolute -bottom-24 -right-16 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 max-w-2xl mx-auto">
          <p class="font-mono text-[11px] sm:text-xs text-blue-300/70 select-none mb-2">text-5xl text-white tracking-tight font-semibold</p>

          <h2 class="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight mb-4">
            Master the Game. <br />
            <span class="font-semibold text-blue-400">Play, Study & Compete.</span>
          </h2>

          <p class="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            Join thousands of serious chess players using modern repertoire trees, neural engine evaluations, and competitive live events.
          </p>

          <!-- Core Feature Badges -->
          <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-300 mb-10">
            <div class="flex items-center gap-1.5">
              <ng-icon name="heroCheck" size="0.95rem" class="text-emerald-400"></ng-icon>
              <span>No Subscription Paywalls</span>
            </div>
            <div class="flex items-center gap-1.5">
              <ng-icon name="heroCheck" size="0.95rem" class="text-emerald-400"></ng-icon>
              <span>Instant Cloud Stockfish 17</span>
            </div>
            <div class="flex items-center gap-1.5">
              <ng-icon name="heroCheck" size="0.95rem" class="text-emerald-400"></ng-icon>
              <span>Collaborative Studies</span>
            </div>
          </div>

          <!-- Dual Action Buttons -->
          <div class="flex flex-wrap items-center justify-center gap-3.5">
            <a routerLink="/study"
              class="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-base transition-all shadow-xl shadow-blue-600/30 active:scale-95">
              <span>Start studying now</span>
              <ng-icon name="heroPlay" size="1.1rem"></ng-icon>
            </a>

            <a routerLink="/events"
              class="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white font-medium text-base transition-all active:scale-95">
              <span>Browse tournaments</span>
              <ng-icon name="heroTrophy" size="1.1rem" class="text-slate-300"></ng-icon>
            </a>
          </div>
        </div>

      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityCtaComponent {}
