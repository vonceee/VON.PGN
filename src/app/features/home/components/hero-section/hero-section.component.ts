import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { PresenceService } from '../../../../core/services/presence.service';
import { ChessWebGLSceneComponent } from '../chess-webgl-scene/chess-webgl-scene.component';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [
    RouterModule,
    ChessWebGLSceneComponent,
  ],
  template: `
    <section class="relative py-8 md:py-14 min-h-[480px] flex flex-col justify-center">
      <div class="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-8 lg:gap-12 px-2 sm:px-4 md:px-6">
        <div class="flex-1 max-w-xl flex flex-col justify-center w-full">
          <div
            class="relative py-4 sm:py-6 before:absolute before:top-0 before:h-px before:bg-slate-200/90 before:left-[-100vw] before:right-[-100vw] md:before:right-0 before:pointer-events-none after:absolute after:bottom-0 after:h-px after:bg-slate-200/90 after:left-[-100vw] after:right-[-100vw] md:after:right-0 after:pointer-events-none">
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tighter text-slate-950 leading-[1.05] text-left">
              Tools that <br class="hidden sm:inline" />
              help you achieve <span class="relative inline-block text-blue-600 font-semibold">chess mastery<svg
                  class="inline-block w-[0.7em] h-[0.7em] text-blue-600 ml-2 align-middle animate-pawn-hop"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
                  <path d="m14.5 10 1.5 8" />
                  <path d="M7 10h10" />
                  <path d="m8 18 1.5-8" />
                  <circle cx="12" cy="6" r="4" />
                </svg></span>
            </h1>
          </div>

          <div
            class="relative py-4 sm:py-5 after:absolute after:bottom-0 after:h-px after:bg-slate-200/90 after:left-[-100vw] after:right-[-100vw] md:after:right-0 after:pointer-events-none">
            <p class="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg">
              A deliberate practice platform packed with features like <span class="text-blue-600 font-medium">openings</span>, <span class="text-blue-600 font-medium">woodpecker</span>, and <span class="text-blue-600 font-medium">engine sparring</span> composed to build mastery directly into your play.
            </p>
          </div>
        </div>

        <div class="hidden md:flex flex-1 items-center justify-center relative w-full h-[360px] lg:h-[420px] xl:h-[460px] min-w-0 overflow-hidden pointer-events-none">
          <app-chess-webgl-scene class="w-full h-full block"></app-chess-webgl-scene>
        </div>
      </div>

      <div
        class="relative w-full py-3 sm:py-3.5 mt-8 sm:mt-10 before:absolute before:top-0 before:h-px before:w-[200vw] before:bg-slate-200/90 before:left-[-100vw] before:pointer-events-none after:absolute after:bottom-0 after:h-px after:w-[200vw] after:bg-slate-200/90 after:left-[-100vw] after:pointer-events-none">
        <div class="flex flex-wrap items-center gap-3 px-2 sm:px-4 md:px-6 justify-start">
          <button type="button" (click)="exploreTools.emit()"
            class="inline-flex items-center justify-center px-4.5 py-2 rounded-full bg-slate-950 text-white font-medium text-sm/6 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-xs">
            <span>Get started</span>
          </button>

          <a routerLink="/study"
            class="flex items-center justify-between gap-3 rounded-full px-4 py-2 text-left text-sm/6 text-slate-500 bg-white/80 backdrop-blur-sm border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:text-slate-800 w-full sm:w-72 md:w-80 transition-all cursor-pointer">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                class="size-4 text-slate-400 shrink-0">
                <path fill-rule="evenodd"
                  d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                  clip-rule="evenodd" />
              </svg>
              <span class="font-normal text-slate-500">Explore studies</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {
  public readonly presenceService = inject(PresenceService);

  public readonly exploreTools = output<void>();
  public readonly exploreGallery = output<void>();
}

