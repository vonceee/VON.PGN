import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TvService, TvGame } from '../../core/services/tv.service';
import { ChessBoardComponent } from '../../shared/components/chess-board/chess-board.component';
import { ChessClockComponent } from '../../shared/components/chess-clock/chess-clock.component';

@Component({
  selector: 'app-tv',
  standalone: true,
  imports: [
    RouterModule,
    ChessBoardComponent,
    ChessClockComponent,
  ],
  templateUrl: './tv.component.html',
})
export class TvComponent implements OnInit, OnDestroy {
  tvService = inject(TvService);
  router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  selectedCategory = signal<'bullet' | 'blitz' | 'rapid'>('bullet');
  boardSize = signal<number>(this.calculateInitialBoardSize());

  selectedGame = computed(() => {
    return this.tvService.tvState()[this.selectedCategory()];
  });

  constructor() {
    // Auto-switch if current category has no games
    effect(() => {
      const state = this.tvService.tvState();
      const current = state[this.selectedCategory()];

      if (!current) {
        const available = this.categories.find((c) => state[c.id]);
        if (available) {
          this.selectedCategory.set(available.id);
        }
      }
    });
  }

  private calculateInitialBoardSize(): number {
    if (isPlatformBrowser(this.platformId)) {
      const vh = window.innerHeight;
      return Math.min(600, vh - 320);
    }
    return 600;
  }

  startBoardResize(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    const startY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    const startSize = this.boardSize();

    const onMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY =
        moveEvent instanceof MouseEvent ? moveEvent.clientY : moveEvent.touches[0].clientY;
      const delta = currentY - startY;
      const newSize = Math.max(300, Math.min(900, startSize + delta));
      this.boardSize.set(newSize);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onMouseMove, { passive: false });
    document.addEventListener('touchend', onMouseUp);
  }

  categories = [
    {
      id: 'bullet' as const,
      name: 'Bullet',
      icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      color: 'text-cyan-400',
    },
    {
      id: 'blitz' as const,
      name: 'Blitz',
      icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
      color: 'text-orange-400',
    },
    {
      id: 'rapid' as const,
      name: 'Rapid',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'text-green-400',
    },
  ];

  ngOnInit() {
    this.tvService.joinTv();
  }

  ngOnDestroy() {
    this.tvService.leaveTv();
  }

  setCategory(cat: 'bullet' | 'blitz' | 'rapid') {
    this.selectedCategory.set(cat);
  }

  goToGame(gameId: string | undefined) {
    if (gameId) {
      this.router.navigate(['/play', gameId]);
    }
  }
}
