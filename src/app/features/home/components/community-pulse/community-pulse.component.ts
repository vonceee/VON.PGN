import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroUsers,
  heroBookOpen,
  heroTrophy,
  heroArrowRight,
  heroSparkles,
} from '@ng-icons/heroicons/outline';
import { CreatorActivityFeedComponent } from '../creator-activity-feed/creator-activity-feed.component';

/**
 * Dedicated Community Pulse & Live Creator Activity Section.
 * Showcases live studies, blogs, and tournaments without obstructing the hero 3D scene.
 */
@Component({
  selector: 'app-community-pulse',
  standalone: true,
  imports: [
    RouterModule,
    NgIconComponent,
    CreatorActivityFeedComponent,
  ],
  providers: [
    provideIcons({
      heroUsers,
      heroBookOpen,
      heroTrophy,
      heroArrowRight,
      heroSparkles,
    }),
  ],
  template: `
    <section class="community-pulse-section py-10 md:py-16">

      <!-- Section Header -->
      <div class="mb-10 max-w-3xl pb-6 border-b border-slate-200/80">
        <p class="font-mono text-[11px] sm:text-xs text-slate-400 select-none mb-1.5">text-5xl text-slate-950 tracking-tight font-semibold</p>
        <h2 class="text-3xl md:text-5xl font-semibold tracking-tight text-slate-950 leading-tight mb-3">
          Community Pulse & <br class="hidden sm:inline" />
          <span class="font-semibold text-blue-600">Creator Activity</span>
        </h2>
        <p class="text-slate-500 text-sm sm:text-base leading-relaxed">
          Discover newly published opening studies, analysis blogs, and upcoming tournaments scheduled across the VON.CHESS creator community.
        </p>
      </div>

      <!-- Main Layout: Feed on Left, Community Spotlight on Right -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        <!-- Left Column: Live Activity Feed Card -->
        <div class="lg:col-span-7 w-full flex max-h-[540px]">
          <div
            class="w-full h-full flex flex-col bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm hover:border-slate-300 transition-all overflow-hidden">
            <app-creator-activity-feed class="w-full h-full flex flex-col overflow-hidden"></app-creator-activity-feed>
          </div>
        </div>

        <!-- Right Column: Community Creator Action Spotlight -->
        <div class="lg:col-span-5 flex flex-col justify-between gap-4">

          <!-- Card 1: Publish Repertoire -->
          <div class="p-6 rounded-3xl bg-white/90 border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ng-icon name="heroBookOpen" size="1.3rem"></ng-icon>
              </div>
              <div>
                <h3 class="font-medium text-slate-900 text-base">Publish a Living Study</h3>
                <div class="text-xs text-blue-600">Repertoire Studio</div>
              </div>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed mb-4">
              Share your tactical discoveries, annotated master games, and opening repertoires with the entire community.
            </p>
            <a routerLink="/study"
              class="inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700">
              <span>Create new study</span>
              <ng-icon name="heroArrowRight" size="0.9rem"></ng-icon>
            </a>
          </div>

          <!-- Card 2: Host Tournament -->
          <div class="p-6 rounded-3xl bg-white/90 border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ng-icon name="heroTrophy" size="1.3rem"></ng-icon>
              </div>
              <div>
                <h3 class="font-medium text-slate-900 text-base">Host Swiss & Arenas</h3>
                <div class="text-xs text-purple-600">Club Organizer</div>
              </div>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed mb-4">
              Organize rated blitz tournaments, team battles, and broadcast Swiss matches with automated pairings.
            </p>
            <a routerLink="/events"
              class="inline-flex items-center gap-2 text-xs font-medium text-purple-600 hover:text-purple-700">
              <span>Schedule tournament</span>
              <ng-icon name="heroArrowRight" size="0.9rem"></ng-icon>
            </a>
          </div>

          <!-- Card 3: Open Source -->
          <div class="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-blue-400">100% Free & Open</span>
              <span class="text-xs text-slate-400 font-mono">v2.4</span>
            </div>
            <h4 class="text-base font-medium mb-1">Built with the Community</h4>
            <p class="text-xs text-slate-300 leading-relaxed">
              VON.CHESS is free software powered by modern Angular, Stockfish, and the open-source chess ecosystem.
            </p>
          </div>

        </div>

      </div>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPulseComponent {}
