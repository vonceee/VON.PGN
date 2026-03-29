import {
  Component,
  ViewChild,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TacticsService, Puzzle } from '../../core/services/tactics.service';
import { UserService } from '../../core/services/user.service';
import { TacticsBoardComponent } from '../../shared/components/tactics-board/tactics-board.component';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [CommonModule, TacticsBoardComponent],
  templateUrl: './tactics.component.html',
})
export class TacticsComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private userService = inject(UserService);

  currentUser = this.userService.currentUser;

  @ViewChild(TacticsBoardComponent) boardComponent!: TacticsBoardComponent;

  currentPuzzle = signal<Puzzle | null>(null);
  isLoading = signal<boolean>(true);
  hasRevealedSolution = signal<boolean>(false);
  userColor = signal<'white' | 'black'>('white');
  status = signal<'playing' | 'success' | 'failed'>('playing');
  ratingChange = signal<number | null>(null);
  newRating = signal<number | null>(null);
  newStreak = signal<number>(0);
  xpEarned = signal<number | null>(null);
  userRating = computed(() => this.userService.currentUser()?.progress?.puzzleRating ?? 1200);
  userStreak = computed(() => this.userService.currentUser()?.progress?.puzzleStreak ?? 0);

  ngOnInit() {
    this.userService.loadMyProfile().subscribe(() => {
      this.newStreak.set(this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
    });
    this.loadNextPuzzle();
  }

  loadNextPuzzle() {
    this.status.set('playing');
    this.ratingChange.set(null);
    this.xpEarned.set(null);
    this.isLoading.set(true);
    this.hasRevealedSolution.set(false);

    this.tacticsService.getDailyPuzzle().subscribe((res) => {
      this.currentPuzzle.set(res.data);
      this.isLoading.set(false);
    });
  }

  onPuzzleSolved() {
    this.status.set('success');
    this.newStreak.update((s) => s + 1);

    const pId = this.currentPuzzle()?.id;
    if (!pId) return;

    this.tacticsService.solvePuzzle(pId, true).subscribe((res) => {
      this.ratingChange.set(res.rating_change);
      this.newRating.set(res.new_rating);
      this.newStreak.set(res.new_streak);
      this.xpEarned.set(res.xp_earned);
      this.userService.loadMyProfile().subscribe();
    });
  }

  onPuzzleFailed() {
    this.status.set('failed');
    this.newStreak.set(0);

    const pId = this.currentPuzzle()?.id;
    if (!pId) return;

    this.tacticsService.solvePuzzle(pId, false).subscribe((res) => {
      this.ratingChange.set(res.rating_change);
      this.newRating.set(res.new_rating);
      this.newStreak.set(res.new_streak);
      this.xpEarned.set(res.xp_earned);
      this.userService.loadMyProfile().subscribe();
    });
  }

  onUserColorChange(color: 'white' | 'black') {
    this.userColor.set(color);
  }

  revealSolution() {
    this.hasRevealedSolution.set(true);
    if (this.boardComponent) {
      this.boardComponent.revealSolution();
    }
  }
}

