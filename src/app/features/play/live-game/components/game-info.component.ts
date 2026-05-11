import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GamePlayer } from '../../../../core/models/game.model';
import { UserStatusIndicatorComponent } from '@shared/ui';
import { UserHovercardDirective } from '@shared/directives';

@Component({
  selector: 'app-game-info',
  standalone: true,
  imports: [UserStatusIndicatorComponent, RouterLink, UserHovercardDirective],
  template: `
    <div class="flex items-center gap-2 overflow-hidden">
      @if (showStatus()) {
        <app-user-status-indicator [userId]="player().id"></app-user-status-indicator>
      }
      <div class="flex items-baseline gap-1.5 overflow-hidden">
        @if (player().name) {
          <a
            [routerLink]="['/user', player().name]"
            [appUserHovercard]="player().name"
            target="_blank"
            rel="noopener noreferrer"
            class="truncate text-md hover:text-cyan-400  cursor-pointer"
          >
            {{ player().name }}
          </a>
        } @else {
          <span class="truncate text-md">Anonymous</span>
        }
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
  showStatus = input<boolean>(true);
}
