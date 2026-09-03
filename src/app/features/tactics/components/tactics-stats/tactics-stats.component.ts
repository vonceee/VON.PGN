import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TacticsStatsComponent
 * 
 * Presentational component rendering puzzle statistics:
 * user rating, rating change delta, streak counter, and the active turn indicator.
 */
@Component({
  selector: 'app-tactics-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tactics-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticsStatsComponent {
  userRating = input<number>(1200);
  ratingChange = input<number | null>(null);
  userStreak = input<number>(0);
  userColor = input<'white' | 'black'>('white');
  status = input<'playing' | 'success' | 'failed'>('playing');
  isLoggedIn = input<boolean>(false);
}
