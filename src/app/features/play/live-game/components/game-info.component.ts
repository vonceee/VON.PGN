import { Component, input } from '@angular/core';
import { GamePlayer } from '../../../../core/models/game.model';

@Component({
  selector: 'app-game-info',
  standalone: true,
  template: `
    <div class="flex items-center justify-between text-sm">
      <div class="flex items-center gap-3 opacity-80 overflow-hidden">
        <div
          class="w-3 h-3 rounded-full shrink-0 border border-slate-500"
          [class.bg-white]="color() === 'white'"
          [class.bg-slate-950]="color() === 'black'"
        ></div>
        <span class="truncate font-bold">{{ player().name || 'Anonymous' }}</span>
      </div>
      <div class="flex items-center gap-2 font-mono text-[13px] shrink-0 ml-4">
        <span class="opacity-50">({{ player().rating || 1500 }})</span>
        @if (ratingChange() !== null && ratingChange() !== undefined) {
          <span 
            class="font-bold whitespace-nowrap"
            [class]="ratingChange()! >= 0 ? 'text-green-400' : 'text-red-400'"
          >
            {{ ratingChange()! > 0 ? '+' : '' }}{{ ratingChange() }}
          </span>
        }
      </div>
    </div>
  `,
})
export class GameInfoComponent {
  player = input.required<GamePlayer>();
  color = input.required<'white' | 'black'>();
  ratingChange = input<number | null>(null);
}
