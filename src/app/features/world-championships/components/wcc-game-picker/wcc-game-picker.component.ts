import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorldChampionshipGame } from '../../../../core/models/world-championship.model';

/**
 * Modular Game Picker Chips Component.
 * 
 * WHY: Provides quick switching between multiple featured games within a championship.
 */
@Component({
  selector: 'app-wcc-game-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (games().length > 1) {
      <div class="flex items-center gap-2 overflow-x-auto pb-4 mb-4">
        <span class="text-xs font-semibold uppercase text-gray-500 shrink-0">Featured Games:</span>
        @for (game of games(); track game.id) {
          <button
            type="button"
            (click)="gameSelected.emit(game)"
            [class.bg-slate-900]="selectedGameId() === game.id"
            [class.text-white]="selectedGameId() === game.id"
            [class.bg-white]="selectedGameId() !== game.id"
            [class.text-slate-700]="selectedGameId() !== game.id"
            class="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 hover:border-slate-400 transition-all shrink-0 cursor-pointer shadow-xs"
          >
            {{ game.title }}
          </button>
        }
      </div>
    }
  `,
})
export class WccGamePickerComponent {
  games = input.required<WorldChampionshipGame[]>();
  selectedGameId = input<string | null | undefined>(null);

  gameSelected = output<WorldChampionshipGame>();
}
