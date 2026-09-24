import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroCpuChip,
  heroBolt,
  heroSparkles,
  heroPlay,
  heroArrowRight,
  heroFire,
} from '@ng-icons/heroicons/outline';

interface BotPersona {
  id: string;
  name: string;
  title: string;
  image: string;
  avatarBg: string;
  rating: number;
  style: string;
  description: string;
  aggressiveness: number; // 0 - 100
  tacticalDepth: number; // 0 - 100
  favoredOpening: string;
}

/**
 * Engine Sparring & AI Personas Showcase.
 * Inspired by chess bots, tailored for serious deliberate practice with distinct playstyles.
 */
@Component({
  selector: 'app-engine-sparring-showcase',
  standalone: true,
  imports: [RouterModule, NgIconComponent],
  providers: [
    provideIcons({
      heroCpuChip,
      heroBolt,
      heroSparkles,
      heroPlay,
      heroArrowRight,
      heroFire,
    }),
  ],
  template: `
    <section class="engine-sparring-section py-10 md:py-16">

      <!-- Section Header -->
      <div class="mb-10 max-w-3xl pb-6 border-b border-slate-200/80">
        <p class="font-mono text-[11px] sm:text-xs text-slate-400 select-none mb-1.5">text-5xl text-slate-950 tracking-tight font-semibold</p>
        <h2 class="text-3xl md:text-5xl font-semibold tracking-tight text-slate-950 leading-tight mb-3">
          Spar Against Tailored <br class="hidden sm:inline" />
          <span class="font-semibold text-blue-600">Chess Personas</span>
        </h2>
        <p class="text-slate-500 text-sm sm:text-base leading-relaxed">
          Calibrate your calculation against neural sparring bots trained on specific historical playstyles—from romantic sacrifices to unyielding positional technique.
        </p>
      </div>

      <!-- Main Showcase Grid: Persona Selector + Active Dossier Card -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        <!-- Left Column: Interactive Persona Cards Grid -->
        <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (bot of bots; track bot.id) {
            <div
              (click)="selectBot(bot)"
              [class]="activeBot().id === bot.id
                ? 'p-5 rounded-3xl bg-white border-2 border-blue-600 shadow-xl shadow-blue-600/10 cursor-pointer transition-all scale-[1.02]'
                : 'p-5 rounded-3xl bg-white/80 hover:bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md cursor-pointer transition-all'">
              
              <div class="flex items-center gap-3.5 mb-3">
                <div class="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-200">
                  <img
                    [src]="bot.image"
                    [alt]="bot.name"
                    class="w-full h-full object-cover object-top"
                    loading="lazy" />
                  <span
                    class="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                    [class]="bot.aggressiveness > 70 ? 'bg-red-500' : 'bg-emerald-500'"></span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-medium text-slate-900 text-base">{{ bot.name }}</h3>
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-medium">
                      {{ bot.rating }}
                    </span>
                  </div>
                  <div class="text-xs text-blue-600 font-medium">{{ bot.title }}</div>
                </div>
              </div>

              <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                {{ bot.description }}
              </p>

              <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>Style: <strong class="text-slate-700 font-medium">{{ bot.style }}</strong></span>
                <span
                  class="font-medium"
                  [class]="activeBot().id === bot.id ? 'text-blue-600' : 'text-slate-400'">
                  {{ activeBot().id === bot.id ? 'Active' : 'Select' }}
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Right Column: Active Bot Dossier & Sparring Launcher -->
        <div class="lg:col-span-5 flex flex-col">
          <div
            class="h-full bg-slate-900 text-white rounded-3xl p-7 sm:p-8 flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden">

            <!-- Background Ambient Radial Glow -->
            <div
              class="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div class="relative z-10">
              <!-- Top Badge -->
              <div class="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div class="flex items-center gap-2 text-xs font-mono text-blue-400">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Neural Engine Loaded</span>
                </div>
                <span class="text-xs font-mono text-slate-400">ELO {{ activeBot().rating }}</span>
              </div>

              <!-- Persona Headliner with Portrait Image -->
              <div class="flex items-center gap-4 mb-5">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-blue-500/40 shadow-xl shrink-0">
                  <img
                    [src]="activeBot().image"
                    [alt]="activeBot().name"
                    class="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <h3 class="text-2xl sm:text-3xl font-light text-white">{{ activeBot().name }}</h3>
                  <div class="text-sm text-blue-400 font-medium">{{ activeBot().title }}</div>
                  <div class="text-xs text-slate-400 mt-0.5">Favored: {{ activeBot().favoredOpening }}</div>
                </div>
              </div>

              <p class="text-sm text-slate-300 leading-relaxed mb-6">
                {{ activeBot().description }}
              </p>

              <!-- Attribute Sliders -->
              <div class="space-y-4 mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="text-slate-400">Aggressiveness</span>
                    <span class="text-amber-400 font-mono font-medium">{{ activeBot().aggressiveness }}%</span>
                  </div>
                  <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-amber-400 rounded-full transition-all duration-300"
                      [style.width.%]="activeBot().aggressiveness"></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="text-slate-400">Tactical Calculation Depth</span>
                    <span class="text-blue-400 font-mono font-medium">{{ activeBot().tacticalDepth }}%</span>
                  </div>
                  <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-blue-500 rounded-full transition-all duration-300"
                      [style.width.%]="activeBot().tacticalDepth"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- CTA Action Button -->
            <div class="relative z-10 pt-4">
              <a
                routerLink="/study"
                class="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-98">
                <span>Spar against {{ activeBot().name }}</span>
                <ng-icon name="heroArrowRight" size="1.1rem"></ng-icon>
              </a>
            </div>

          </div>
        </div>

      </div>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineSparringShowcaseComponent {
  public readonly bots: BotPersona[] = [
    {
      id: 'tal',
      name: 'Mikhail Tal',
      title: 'The Magician of Riga',
      image: 'assets/player-profiles/mikhail-tal.webp',
      avatarBg: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      rating: 2650,
      style: 'Hyper-Aggressive Sacrificial',
      description:
        'Trades material without hesitation to drag enemy kings into deep tactical complications where 2+2=5.',
      aggressiveness: 98,
      tacticalDepth: 90,
      favoredOpening: "King's Indian / Sicilian Dragon",
    },
    {
      id: 'fischer',
      name: 'Bobby Fischer',
      title: 'The Reykjavik Champion',
      image: 'assets/player-profiles/robert-james-fischer.webp',
      avatarBg: 'linear-gradient(135deg, #2563eb, #1e40af)',
      rating: 2785,
      style: 'Relentless Precision',
      description:
        'Plays classical moves with absolute accuracy and uncompromising willpower. Demands tactical perfection.',
      aggressiveness: 88,
      tacticalDepth: 96,
      favoredOpening: '1. e4 / Najdorf Sicilian',
    },
    {
      id: 'petrosian',
      name: 'Tigran Petrosian',
      title: 'The Iron Fortress',
      image: 'assets/player-profiles/tigran-petrosian.webp',
      avatarBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      rating: 2600,
      style: 'Prophylactic Iron Grip',
      description:
        'Senses your tactical threats moves before they appear. Neutralizes counterplay and converts microscopic endgame pluses.',
      aggressiveness: 32,
      tacticalDepth: 94,
      favoredOpening: "Caro-Kann / Queen's Gambit",
    },
    {
      id: 'capablanca',
      name: 'José Raúl Capablanca',
      title: 'The Chess Machine',
      image: 'assets/player-profiles/jose-raul-capablanca.webp',
      avatarBg: 'linear-gradient(135deg, #10b981, #047857)',
      rating: 2700,
      style: 'Crystal Clear Classical',
      description:
        'Plays seemingly effortless moves with pinpoint endgame precision. Converts rook-and-pawn endings flawlessly.',
      aggressiveness: 55,
      tacticalDepth: 92,
      favoredOpening: 'Ruy Lopez / Orthodox QGD',
    },
    {
      id: 'polgar',
      name: 'Judit Polgár',
      title: 'The Queen of Attack',
      image: 'assets/player-profiles/judit-polgar.webp',
      avatarBg: 'linear-gradient(135deg, #ec4899, #be185d)',
      rating: 2735,
      style: 'Fierce King Attack',
      description:
        'Dismantles defense structures with venomous king-side assaults and tactical combinations.',
      aggressiveness: 94,
      tacticalDepth: 92,
      favoredOpening: 'Sicilian Defense / French',
    },
    {
      id: 'karpov',
      name: 'Anatoly Karpov',
      title: 'The Boa Constrictor',
      image: 'assets/player-profiles/anatoly-karpov.webp',
      avatarBg: 'linear-gradient(135deg, #6366f1, #4338ca)',
      rating: 2720,
      style: 'Positional Strangulation',
      description:
        'Deprives opponents of active squares one piece at a time until no constructive moves remain.',
      aggressiveness: 40,
      tacticalDepth: 95,
      favoredOpening: "Caro-Kann / English Opening",
    },
  ];

  public readonly activeBot = signal<BotPersona>(this.bots[0]);

  public selectBot(bot: BotPersona): void {
    this.activeBot.set(bot);
  }
}
