import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PuzzleAttempt } from '../../models/tactics.model';

/**
 * TacticsToolbarComponent
 * 
 * Presentational and interactive component for:
 * - Reviewing recent puzzle attempts
 * - Navigating previous and next plies
 * - Triggering fetch for the next puzzle
 */
@Component({
  selector: 'app-tactics-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tactics-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticsToolbarComponent {
  recentAttempts = input<PuzzleAttempt[]>([]);
  currentPuzzleId = input<number | undefined>(undefined);
  currentPly = input<number>(0);
  minPly = input<number>(0);
  maxPly = input<number>(0);
  status = input<'playing' | 'success' | 'failed'>('playing');
  isTransitioning = input<boolean>(false);
  isLoggedIn = input<boolean>(false);

  selectAttempt = output<number>();
  prevMove = output<void>();
  nextMove = output<void>();
  nextPuzzle = output<void>();

  isNextDisabled = computed(() => {
    return this.status() === 'playing' || this.isTransitioning();
  });

  onNextPuzzleClick() {
    if (!this.isNextDisabled()) {
      this.nextPuzzle.emit();
    }
  }
}
