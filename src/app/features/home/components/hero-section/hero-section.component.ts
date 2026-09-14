import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  heroArrowDown,
  heroEye,
  heroPlay,
} from '@ng-icons/heroicons/outline';
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
    <section class="relative overflow-hidden mb-20 md:mb-28 md:pr-20 lg:pr-28 pt-4 md:pt-8 rounded-4xl min-h-[540px] flex items-center">

      <!-- Procedural 3D Chessboard Background Canvas (Fully Unblocked) -->
      <div class="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <app-chess-webgl-scene #chessScene class="w-full h-full block"></app-chess-webgl-scene>
      </div>

      <!-- Hero Content Grid Layer (Elevated z-10 for legibility & interaction) -->
      <div class="relative z-10 w-full py-6 md:py-12">

        <!-- Left Column: Headline, CTAs, Live Stats -->
        <div class="max-w-xl flex flex-col justify-center min-h-[420px] w-full px-2 sm:px-4 md:px-6">

          <!-- Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-light text-slate-900 leading-none mb-6 text-left">
            Tools that <br class="hidden sm:inline" />
            help you achieve <span class="font-normal relative inline-block text-blue-600">chess mastery<svg
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

          <!-- Programmatic Anchor CTAs with Curated Easing -->
          <div class="flex flex-wrap items-center gap-3.5 justify-start">
            <button type="button" (click)="exploreTools.emit()"
              class="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-slate-900 text-white font-medium text-[15px] leading-5 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95 transition-all cursor-pointer">
              <span>Explore tools</span>
            </button>

            <a routerLink="/study"
              class="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 font-medium text-[15px] leading-5 hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all">
              <span>Start studying</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {
  public readonly presenceService = inject(PresenceService);
  public readonly chessScene = viewChild(ChessWebGLSceneComponent);

  public readonly exploreTools = output<void>();
  public readonly exploreGallery = output<void>();

  /**
   * Forwards scroll progress down to the 3D scene.
   */
  public setScrollProgress(progress: number): void {
    this.chessScene()?.setScrollProgress(progress);
  }
}

