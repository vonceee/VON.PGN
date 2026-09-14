import {
  Component,
  ChangeDetectionStrategy,
  signal,
  output,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroBookOpen,
  heroPuzzlePiece,
  heroQuestionMarkCircle,
  heroGlobeAsiaAustralia,
  heroTrophy,
  heroCommandLine,
  heroArrowRight,
  heroPlay,
} from '@ng-icons/heroicons/outline';
import { FloatingCursorTriggerDirective } from '@shared/directives';

export type ToolkitCategory = 'all' | 'openings' | 'tactics' | 'analysis' | 'tournaments';

/**
 * 3-Column Training Toolkit Grid with category filtering and Lenis velocity skew inertia.
 */
@Component({
  selector: 'app-toolkit-grid',
  standalone: true,
  imports: [
    RouterModule,
    NgIconComponent,
    FloatingCursorTriggerDirective,
  ],
  providers: [
    provideIcons({
      heroBookOpen,
      heroPuzzlePiece,
      heroQuestionMarkCircle,
      heroGlobeAsiaAustralia,
      heroTrophy,
      heroCommandLine,
      heroArrowRight,
      heroPlay,
    }),
  ],
  template: `
    <section id="toolsSection" class="pt-8 mb-24 md:mb-32 md:pr-20 lg:pr-28">

      <!-- Section Header & Category Filter Tabs -->
      <header class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 class="text-3xl md:text-4xl font-light text-slate-900 leading-tight">_</h2>
        </div>

        <!-- Category Tabs -->
        <div
          class="w-full md:w-auto overflow-x-auto no-scrollbar flex flex-nowrap md:flex-wrap items-center gap-2.5 shrink-0 pb-2 -mb-2">
          @for (cat of categories; track cat.id) {
            <button type="button" (click)="setCategory(cat.id)"
              [class]="activeCategory() === cat.id 
                ? 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[14px] cursor-pointer shrink-0 shadow-xs transition-all' 
                : 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-800 font-medium text-[14px] hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shrink-0'">
              {{ cat.label }}
            </button>
          }
        </div>
      </header>

      <!-- 3-Column Responsive Grid with Lenis Velocity Skew Inertia (.skew-on-scroll) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <!-- Card 1: Opening Studies -->
        @if (activeCategory() === 'all' || activeCategory() === 'openings') {
        <div routerLink="/study" [queryParams]="{ category: 'opening_repertoire' }" appFloatingCursorTrigger="Explore"
          cursorIcon="heroPlay"
          class="skew-on-scroll group bg-slate-900 border border-white/10 rounded-3xl p-7 flex flex-col justify-between min-h-[220px] md:h-60 cursor-none shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 will-change-transform">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div
                class="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <ng-icon name="heroBookOpen" size="1.6rem" color="white" class="text-white shrink-0"></ng-icon>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white border border-white/10">
                Featured
              </span>
            </div>
            <h3 class="text-xl font-medium mb-1.5 text-white group-hover:text-blue-200 transition-colors">Opening
              studies</h3>
            <p class="text-slate-300 text-sm leading-relaxed">
              Study opening repertoire trees, branch candidate moves, and train master lines.
            </p>
          </div>
          <div class="flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
            <span>Repertoire studio</span>
            <ng-icon name="heroArrowRight" size="0.9rem"
              class="group-hover:translate-x-1 transition-transform"></ng-icon>
          </div>
        </div>
        }

        <!-- Card 2: Tactics & Puzzles -->
        @if (activeCategory() === 'all' || activeCategory() === 'tactics') {
        <div routerLink="/tactics" appFloatingCursorTrigger="Explore" cursorIcon="heroPlay"
          class="skew-on-scroll group bg-slate-900 border border-white/10 rounded-3xl p-7 flex flex-col justify-between min-h-[220px] md:h-60 cursor-none shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 will-change-transform">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div
                class="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <ng-icon name="heroPuzzlePiece" size="1.6rem" color="white" class="text-white shrink-0"></ng-icon>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white border border-white/10">
                Tactics
              </span>
            </div>
            <h3 class="text-xl font-medium mb-1.5 text-white group-hover:text-blue-200 transition-colors">Tactics &
              puzzles</h3>
            <p class="text-slate-300 text-sm leading-relaxed">
              Build pattern recognition with themed puzzles, speed tactics, and woodpecker cycles.
            </p>
          </div>
          <div class="flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
            <span>Puzzle trainer</span>
            <ng-icon name="heroArrowRight" size="0.9rem"
              class="group-hover:translate-x-1 transition-transform"></ng-icon>
          </div>
        </div>
        }

        <!-- Card 3: Guess the Game -->
        @if (activeCategory() === 'all' || activeCategory() === 'tactics') {
        <div routerLink="/tactics/guess" appFloatingCursorTrigger="Explore" cursorIcon="heroPlay"
          class="skew-on-scroll group bg-slate-900 border border-white/10 rounded-3xl p-7 flex flex-col justify-between min-h-[220px] md:h-60 cursor-none shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 will-change-transform">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div
                class="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <ng-icon name="heroQuestionMarkCircle" size="1.6rem" color="white"
                  class="text-white shrink-0"></ng-icon>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white border border-white/10">
                History
              </span>
            </div>
            <h3 class="text-xl font-medium mb-1.5 text-white group-hover:text-blue-200 transition-colors">Guess the game
            </h3>
            <p class="text-slate-300 text-sm leading-relaxed">
              Test your historical intuition from immortal classical clashes and master moves.
            </p>
          </div>
          <div class="flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
            <span>Historical test</span>
            <ng-icon name="heroArrowRight" size="0.9rem"
              class="group-hover:translate-x-1 transition-transform"></ng-icon>
          </div>
        </div>
        }

        <!-- Card 4: World Championships -->
        @if (activeCategory() === 'all' || activeCategory() === 'analysis') {
        <div routerLink="/world-championships" appFloatingCursorTrigger="Explore" cursorIcon="heroPlay"
          class="skew-on-scroll group bg-slate-900 border border-white/10 rounded-3xl p-7 flex flex-col justify-between min-h-[220px] md:h-60 cursor-none shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 will-change-transform">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div
                class="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <ng-icon name="heroGlobeAsiaAustralia" size="1.6rem" color="white"
                  class="text-white shrink-0"></ng-icon>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white border border-white/10">
                Championships
              </span>
            </div>
            <h3 class="text-xl font-medium mb-1.5 text-white group-hover:text-blue-200 transition-colors">World
              championships</h3>
            <p class="text-slate-300 text-sm leading-relaxed">
              Study world championship matches, player biographies, and classical crown games.
            </p>
          </div>
          <div class="flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
            <span>Match archive</span>
            <ng-icon name="heroArrowRight" size="0.9rem"
              class="group-hover:translate-x-1 transition-transform"></ng-icon>
          </div>
        </div>
        }

        <!-- Card 5: Swiss & Arena Tournaments -->
        @if (activeCategory() === 'all' || activeCategory() === 'tournaments') {
        <div routerLink="/events" appFloatingCursorTrigger="Explore" cursorIcon="heroPlay"
          class="skew-on-scroll group bg-slate-900 border border-white/10 rounded-3xl p-7 flex flex-col justify-between min-h-[220px] md:h-60 cursor-none shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 will-change-transform">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div
                class="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <ng-icon name="heroTrophy" size="1.6rem" color="white" class="text-white shrink-0"></ng-icon>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white border border-white/10">
                OTB & Arena
              </span>
            </div>
            <h3 class="text-xl font-medium mb-1.5 text-white group-hover:text-blue-200 transition-colors">Tournaments
            </h3>
            <p class="text-slate-300 text-sm leading-relaxed">
              Compete in live Swiss or Arena tourneys, view real-time standings, and review games.
            </p>
          </div>
          <div class="flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
            <span>Live events</span>
            <ng-icon name="heroArrowRight" size="0.9rem"
              class="group-hover:translate-x-1 transition-transform"></ng-icon>
          </div>
        </div>
        }

        <!-- Card 6: Interactive Study Board -->
        @if (activeCategory() === 'all' || activeCategory() === 'analysis') {
        <div routerLink="/study" appFloatingCursorTrigger="Explore" cursorIcon="heroPlay"
          class="skew-on-scroll group bg-slate-900 border border-white/10 rounded-3xl p-7 flex flex-col justify-between min-h-[220px] md:h-60 cursor-none shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 will-change-transform">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div
                class="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <ng-icon name="heroCommandLine" size="1.6rem" color="white" class="text-white shrink-0"></ng-icon>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white border border-white/10">
                Engine
              </span>
            </div>
            <h3 class="text-xl font-medium mb-1.5 text-white group-hover:text-blue-200 transition-colors">Interactive
              study</h3>
            <p class="text-slate-300 text-sm leading-relaxed">
              Create collaborative chess studies, analyze move trees, paste PGN logs, and train repertoires.
            </p>
          </div>
          <div class="flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
            <span>Open board</span>
            <ng-icon name="heroArrowRight" size="0.9rem"
              class="group-hover:translate-x-1 transition-transform"></ng-icon>
          </div>
        </div>
        }

      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolkitGridComponent {
  public readonly activeCategory = signal<ToolkitCategory>('all');
  public readonly categoryChanged = output<ToolkitCategory>();

  public readonly categories: { id: ToolkitCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'openings', label: 'Openings' },
    { id: 'tactics', label: 'Tactics' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'tournaments', label: 'Tournaments' },
  ];

  public setCategory(cat: ToolkitCategory): void {
    this.activeCategory.set(cat);
    this.categoryChanged.emit(cat);
  }
}
