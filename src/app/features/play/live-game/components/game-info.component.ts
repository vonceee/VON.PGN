import { Component, input } from '@angular/core';
import { GamePlayer } from '../../../../core/models/game.model';

@Component({
  selector: 'app-game-info',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 text-sm overflow-hidden">
      <div
        class="w-3 h-3 rounded-full shrink-0 border border-border-theme"
        [class.bg-white]="color() === 'white'"
        [class.bg-slate-950]="color() === 'black'"
      ></div>
      <div class="flex items-baseline gap-1.5 overflow-hidden">
        <span class="truncate font-bold">{{ player().name || 'Anonymous' }}</span>
        <span class="text-xs shrink-0">({{ player().rating || 1500 }})</span>
      </div>
      @if (ratingChange() !== null && ratingChange() !== undefined) {
        <span
          class="text-xs shrink-0 font-bold whitespace-nowrap ml-2"
          [class]="ratingChange()! >= 0 ? 'text-green-400' : 'text-red-400'"
        >
          {{ ratingChange()! > 0 ? '+' : '' }}{{ ratingChange() }}
        </span>
      }
    </div>
  `,
})
export class GameInfoComponent {
  player = input.required<GamePlayer>();
  color = input.required<'white' | 'black'>();
  ratingChange = input<number | null>(null);
}
