import { Component, input } from '@angular/core';
import { GamePlayer } from '../../../../core/models/game.model';
import { UserStatusIndicatorComponent } from '@shared/ui';

@Component({
  selector: 'app-game-info',
  standalone: true,
  imports: [UserStatusIndicatorComponent],
  template: `
    <div class="flex items-center gap-2 overflow-hidden">
      <app-user-status-indicator [userId]="player().id"></app-user-status-indicator>
      <div class="flex items-baseline gap-1.5 overflow-hidden">
        <span class="truncate text-md">{{ player().name || 'Anonymous' }}</span>
        <span class="text-sm shrink-0">({{ player().rating || 1500 }})</span>
      </div>

      @if (ratingChange() !== null && ratingChange() !== undefined) {
        <span
          class="text-md shrink-0"
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
