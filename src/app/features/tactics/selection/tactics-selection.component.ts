import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

/**
 * Tactics selection page component.
 * 
 * WHY: Serves as the landing hub for all tactics training modes (Casual, Themes, Woodpecker).
 * Adopts the architectural 3-column bleeding grid layout with diagonal rails matching the homepage standard.
 */
@Component({
  selector: 'app-tactics-selection',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterModule,
    FloatingCursorContainerDirective,
    FloatingCursorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tactics-selection.component.html',
  host: {
    class: 'block w-full',
  },
})
export class TacticsSelectionComponent {
  private userService = inject(UserService);

  currentUser = this.userService.currentUser;
  userRating = computed(() => this.userService.currentUser()?.progress?.puzzleRating ?? 1200);
}
