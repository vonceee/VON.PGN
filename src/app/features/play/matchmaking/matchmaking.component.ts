import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  template: `
    <div class="flex items-center justify-center px-4">
      <div class="max-w-xl w-full">
        @if (!gameService.isSearching()) {
          <div class="space-y-6">
            @for (category of categories; track category.key) {
              <div>
                <h3 class="text-sm font-semibold uppercase tracking-wider mb-3">
                  {{ category.label }}
                </h3>
                <div class="grid grid-cols-3 gap-3">
                  @for (tc of category.controls; track tc.value) {
                    <button
                      (click)="seekGame(tc)"
                      class="border border-border-theme hover:bg-cyan-400 hover:cursor-pointer rounded-lg p-8 text-center transition-all duration-200 group"
                    >
                      <div class="text-4xl font-bold">
                        {{ tc.label }}
                      </div>
                      <div class="text-lg mt-1">
                        {{ tc.category }}
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          @if (activeGameId()) {
            <div class="mt-8 text-center">
              <p class="text-slate-400 mb-2">You have an active game</p>
              <button
                (click)="rejoinGame()"
                class="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors"
              >
                Rejoin Game
              </button>
            </div>
          }
        } @else {
          <div class="text-center">
            <div class="mb-6">
              <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-4">
                <div class="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 class="text-2xl font-bold text-white mb-2">Searching...</h2>
              <p class="text-slate-400">
                Looking for an opponent at {{ selectedTimeControl()?.label }}
              </p>
            </div>

            <button
              (click)="cancelSearch()"
              class="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class MatchmakingComponent implements OnInit, OnDestroy {
  gameService = inject(GameService);
  private router = inject(Router);

  selectedTimeControl = this.gameService.searchTimeControl
    ? () => TIME_CONTROLS.find((tc) => tc.value === this.gameService.searchTimeControl())
    : () => undefined;

  activeGameId = () => this.gameService.gameState()?.id ?? null;

  categories = [
    { key: 'bullet', label: 'Bullet', controls: TIME_CONTROLS.filter((tc) => tc.category === 'bullet') },
    { key: 'blitz', label: 'Blitz', controls: TIME_CONTROLS.filter((tc) => tc.category === 'blitz') },
    { key: 'rapid', label: 'Rapid', controls: TIME_CONTROLS.filter((tc) => tc.category === 'rapid') },
  ];

  ngOnInit(): void {
    this.gameService.checkActiveGame();
  }

  ngOnDestroy(): void {
    // Don't cancel search on destroy - user might navigate away briefly
  }

  seekGame(tc: TimeControlOption): void {
    this.gameService.seekGame(tc.value);
  }

  cancelSearch(): void {
    this.gameService.cancelSeek();
  }

  rejoinGame(): void {
    const gameId = this.gameService.gameState()?.id;
    if (gameId) {
      this.router.navigate(['/play', gameId]);
    }
  }

  formatTime(seconds: number): string {
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return s > 0 ? `${m}m ${s}s` : `${m} min`;
    }
    return `${seconds} sec`;
  }
}
