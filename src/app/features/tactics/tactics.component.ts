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
import { ServerMaintenanceComponent } from '../../shared/components/server-maintenance/server-maintenance.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [CommonModule, TacticsBoardComponent, ServerMaintenanceComponent, RouterLink],
  templateUrl: './tactics.component.html',
})
export class TacticsComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private userService = inject(UserService);

  currentUser = this.userService.currentUser;

  @ViewChild(TacticsBoardComponent) boardComponent!: TacticsBoardComponent;

  currentPuzzle = signal<Puzzle | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  hasRevealedSolution = signal<boolean>(false);
  userColor = signal<'white' | 'black'>('white');
  status = signal<'playing' | 'success' | 'failed'>('playing');
  ratingChange = signal<number | null>(null);
  newRating = signal<number | null>(null);
  newStreak = signal<number>(0);
  userRating = computed(() => this.userService.currentUser()?.progress?.puzzleRating ?? 1200);
  userStreak = computed(() => this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
  boardSize = signal(this.loadBoardSize());

  private loadBoardSize(): number {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('boardSize');
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= 280 && size <= 560) return size;
      }
    }
    return 400;
  }

  private saveBoardSize(size: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardSize', size.toString());
    }
  }

  onBoardSizeChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.boardSize.set(value);
    this.saveBoardSize(value);
  }

  ngOnInit() {
    if (this.currentUser()) {
      this.userService.loadMyProfile().subscribe(() => {
        this.newStreak.set(this.userService.currentUser()?.progress?.puzzleStreak ?? 0);
      });
    }
    this.loadNextPuzzle();
  }

  loadNextPuzzle() {
    this.status.set('playing');
    this.ratingChange.set(null);
    this.isLoading.set(true);
    this.hasError.set(false);
    this.hasRevealedSolution.set(false);

    this.tacticsService.getDailyPuzzle().subscribe({
      next: (res) => {
        this.currentPuzzle.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
  }

  onPuzzleSolved() {
    this.status.set('success');
    
    if (this.currentUser()) {
      this.newStreak.update((s) => s + 1);

      const pId = this.currentPuzzle()?.id;
      if (!pId) return;

      this.tacticsService.solvePuzzle(pId, true).subscribe((res) => {
        this.ratingChange.set(res.rating_change);
        this.newRating.set(res.new_rating);
        this.newStreak.set(res.new_streak);
        this.userService.loadMyProfile().subscribe();
      });
    }
  }

  onPuzzleFailed() {
    this.status.set('failed');

    if (this.currentUser()) {
      this.newStreak.set(0);

      const pId = this.currentPuzzle()?.id;
      if (!pId) return;

      this.tacticsService.solvePuzzle(pId, false).subscribe((res) => {
        this.ratingChange.set(res.rating_change);
        this.newRating.set(res.new_rating);
        this.newStreak.set(res.new_streak);
        this.userService.loadMyProfile().subscribe();
      });
    }
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

