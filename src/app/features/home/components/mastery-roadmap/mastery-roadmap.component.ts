import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroAcademicCap,
  heroArrowRight,
  heroCheck,
  heroSparkles,
  heroPlay,
} from '@ng-icons/heroicons/outline';

interface RoadmapStep {
  level: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  route: string;
  badge: string;
  colorClass: string;
  pieceImage: string;
}

/**
 * Mastery Roadmap Section.
 * Inspired by structured lesson paths, guiding players through deliberate practice stages.
 */
@Component({
  selector: 'app-mastery-roadmap',
  standalone: true,
  imports: [RouterModule, NgIconComponent],
  providers: [
    provideIcons({
      heroAcademicCap,
      heroArrowRight,
      heroCheck,
      heroSparkles,
      heroPlay,
    }),
  ],
  template: `
    <section class="mastery-roadmap-section py-16 md:py-24 mb-20 md:mb-32 md:pr-20 lg:pr-28">

      <!-- Section Header -->
      <div class="mb-14 max-w-3xl">
        <div
          class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-medium mb-4">
          <ng-icon name="heroAcademicCap" size="0.95rem"></ng-icon>
          <span>Curated Learning Curriculum</span>
        </div>
        <h2 class="text-3xl md:text-5xl font-light text-slate-900 leading-tight mb-4">
          The Deliberate Practice <br />
          <span class="font-normal text-blue-600">Roadmap to Mastery</span>
        </h2>
        <p class="text-slate-600 text-base leading-relaxed">
          Chess improvement is not random games—it is structured mastery. Progress through our battle-tested curriculum designed to take you from pattern recognition to tournament title contention.
        </p>
      </div>

      <!-- Roadmap Steps Grid (Stepped Progression) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (step of steps; track step.level) {
          <div
            class="skew-on-scroll group bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-blue-400/50 transition-all duration-300">
            
            <div>
              <!-- Piece Graphic & Level Indicator -->
              <div class="flex items-center justify-between mb-4">
                <div class="w-12 h-12 rounded-2xl bg-slate-100/90 border border-slate-200/80 p-2 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors shadow-xs">
                  <img [src]="step.pieceImage" [alt]="step.title" class="w-full h-full object-contain" />
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-xs font-mono font-bold text-blue-600">{{ step.level }}</span>
                  <span
                    class="mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                    [class]="step.colorClass">
                    {{ step.badge }}
                  </span>
                </div>
              </div>

              <h3 class="text-lg font-medium text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                {{ step.title }}
              </h3>
              <div class="text-xs text-slate-400 mb-4">{{ step.subtitle }}</div>

              <p class="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                {{ step.description }}
              </p>

              <!-- Feature Bullet Points -->
              <div class="space-y-2 mb-6 pt-4 border-t border-slate-100">
                @for (feat of step.features; track feat) {
                  <div class="flex items-center gap-2 text-xs text-slate-600">
                    <span class="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ng-icon name="heroCheck" size="0.75rem"></ng-icon>
                    </span>
                    <span>{{ feat }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Card Bottom Action Link -->
            <a
              [routerLink]="step.route"
              class="inline-flex items-center justify-between text-xs font-medium text-blue-600 group-hover:text-blue-700 pt-3 border-t border-slate-100">
              <span>Start milestone</span>
              <ng-icon name="heroArrowRight" size="0.9rem" class="group-hover:translate-x-1 transition-transform"></ng-icon>
            </a>

          </div>
        }
      </div>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasteryRoadmapComponent {
  public readonly steps: RoadmapStep[] = [
    {
      level: 'PHASE 01',
      title: 'Tactical Reflexes',
      subtitle: '1000 - 1400 ELO',
      description:
        'Condition unconscious pattern recognition for double attacks, pins, deflection, and back-rank weaknesses.',
      features: [
        'Themed tactical sets',
        'Speed benchmark timer',
        'Woodpecker repetition cycle',
      ],
      route: '/tactics',
      badge: 'Foundation',
      colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      pieceImage: 'pieces/cburnett/wP.svg',
    },
    {
      level: 'PHASE 02',
      title: 'Repertoire Building',
      subtitle: '1400 - 1800 ELO',
      description:
        'Construct watertight opening trees with candidate branches, move transposition logs, and Stockfish depth evaluations.',
      features: [
        'Full PGN studio import',
        'Candidate move branching',
        'Interactive drill mode',
      ],
      route: '/study',
      badge: 'Opening Architecture',
      colorClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      pieceImage: 'pieces/cburnett/wN.svg',
    },
    {
      level: 'PHASE 03',
      title: 'Classical Intuition',
      subtitle: '1800 - 2100 ELO',
      description:
        'Test your move predictions against classical champions and study world championship decisive game archives.',
      features: [
        'Guess the Move engine',
        'Steinitz to Ding match archives',
        'Grandmaster commentary',
      ],
      route: '/tactics/guess',
      badge: 'Deep Calculation',
      colorClass: 'bg-purple-50 text-purple-700 border border-purple-200',
      pieceImage: 'pieces/cburnett/wB.svg',
    },
    {
      level: 'PHASE 04',
      title: 'Competitive Arenas',
      subtitle: '2100+ ELO & Title',
      description:
        'Put your repertoire under live tournament clock conditions in Swiss arenas with millisecond sync.',
      features: [
        'Official Swiss pairings',
        'Sonneborn-Berger tiebreaks',
        'Real-time broadcast sync',
      ],
      route: '/events',
      badge: 'Championships',
      colorClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      pieceImage: 'pieces/cburnett/wK.svg',
    },
  ];
}
