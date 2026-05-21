import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-tactics-selection',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
