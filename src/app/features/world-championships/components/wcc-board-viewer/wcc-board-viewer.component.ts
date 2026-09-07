import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from '@shared/chess';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowsRightLeft,
  heroChevronLeft,
  heroChevronRight,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroPlay,
  heroStop,
} from '@ng-icons/heroicons/outline';

/**
 * Modular Chessboard & Navigation Controls Component.
 * 
 * WHY: Encapsulates the interactive right-column layout from the user inspiration images,
 *      providing synchronized controls, auto-play, turn indicators, and direct move play
 *      across both reading and blog-authoring experiences using the unified study pill toolbar design.
 */
@Component({
  selector: 'app-wcc-board-viewer',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, NgIconComponent],
  providers: [
    provideIcons({
      heroArrowsRightLeft,
      heroChevronLeft,
      heroChevronRight,
      heroChevronDoubleLeft,
      heroChevronDoubleRight,
      heroPlay,
      heroStop,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
      <!-- Chessboard Container -->
      <div class="w-full aspect-square flex items-center justify-center relative overflow-hidden">
        <app-chess-board
          [fen]="fen()"
          [orientation]="orientation()"
          [interactive]="interactive()"
          [resizable]="false"
          [fluid]="true"
          [hideCoordinates]="false"
          (moveMade)="moveMade.emit($event)"
        ></app-chess-board>
      </div>

      <!-- Controls Toolbar -->
      <div
        class="mt-4 mx-auto p-2 gap-4 flex items-center justify-between border-2 border-slate-200 rounded-4xl select-none w-fit shrink-0 bg-white">
        
        <!-- Flip Board Button -->
        <button
          type="button"
          (click)="flip.emit()"
          title="Flip Board"
          class="p-2 rounded-full transition-colors cursor-pointer hover:bg-slate-200 flex items-center justify-center text-slate-700"
        >
          <ng-icon name="heroArrowsRightLeft" class="text-lg"></ng-icon>
        </button>

        <div class="h-4 w-px bg-slate-200 shrink-0"></div>

        <!-- Navigation Buttons: Previous & Next Move -->
        <div class="flex items-center gap-1.5">
          <!-- Previous Move Button < -->
          <button
            type="button"
            (click)="onPrev()"
            [disabled]="currentPly() === 0"
            title="Previous Move"
            class="p-2 rounded-full transition-colors cursor-pointer hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700"
          >
            <ng-icon name="heroChevronLeft" class="text-lg"></ng-icon>
          </button>

          <!-- Next Move Button > -->
          <button
            type="button"
            (click)="onNext()"
            [disabled]="currentPly() === maxPly()"
            title="Next Move"
            class="p-2 rounded-full transition-colors cursor-pointer hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700"
          >
            <ng-icon name="heroChevronRight" class="text-lg"></ng-icon>
          </button>
        </div>

        <div class="h-4 w-px bg-slate-200 shrink-0"></div>

        <!-- Play / Auto-Step Button (Rightmost) -->
        <button
          type="button"
          (click)="toggleAutoPlay()"
          [title]="isPlaying() ? 'Pause auto-play' : 'Play moves automatically'"
          [class.text-emerald-600]="isPlaying()"
          [class.bg-emerald-50]="isPlaying()"
          class="p-2 rounded-full transition-colors cursor-pointer hover:bg-slate-200 flex items-center justify-center text-slate-700"
        >
          <ng-icon [name]="isPlaying() ? 'heroStop' : 'heroPlay'" class="text-lg"></ng-icon>
        </button>
      </div>

      <!-- Editor-Specific Actions Toolbar -->
      @if (isEditor()) {
        <div class="pt-2 border-t border-slate-100 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="annotateMove.emit()"
              [disabled]="currentPly() === 0"
              class="flex-1 py-1.5 px-3 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Insert current move annotation into narrative story"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Annotate Move
            </button>

            <button
              type="button"
              (click)="undoMove.emit()"
              [disabled]="currentPly() === 0"
              class="py-1.5 px-3 rounded-full text-xs font-medium border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 text-slate-700 cursor-pointer"
              title="Undo last played move"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              Undo
            </button>
          </div>

          <p class="text-[11px] text-gray-500 text-center">
            💡 Drag pieces on the board to play moves, or click move chips to jump.
          </p>
        </div>
      }
  `,
})
export class WccBoardViewerComponent implements OnDestroy {
  fen = input.required<string>();
  orientation = input<'white' | 'black'>('white');
  currentPly = input<number>(0);
  maxPly = input<number>(0);
  moveLabel = input<string>('Start');
  interactive = input<boolean>(false);
  isEditor = input<boolean>(false);

  goToFirst = output<void>();
  prev = output<void>();
  next = output<void>();
  goToLast = output<void>();
  flip = output<void>();
  moveMade = output<{ move: any; fen: string; uci: string }>();
  undoMove = output<void>();
  annotateMove = output<void>();

  isPlaying = signal<boolean>(false);
  private playIntervalId: any = null;

  isWhiteTurn = computed(() => {
    // ply 0 is White to move, ply 1 is Black to move, ply 2 is White to move...
    return this.currentPly() % 2 === 0;
  });

  toggleAutoPlay(): void {
    if (this.isPlaying()) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (this.currentPly() >= this.maxPly()) {
      this.goToFirst.emit();
    }
    this.isPlaying.set(true);
    this.playIntervalId = setInterval(() => {
      if (this.currentPly() < this.maxPly()) {
        this.next.emit();
      } else {
        this.stopAutoPlay();
      }
    }, 1200);
  }

  private stopAutoPlay(): void {
    this.isPlaying.set(false);
    if (this.playIntervalId) {
      clearInterval(this.playIntervalId);
      this.playIntervalId = null;
    }
  }

  onPrev(): void {
    this.stopAutoPlay();
    this.prev.emit();
  }

  onNext(): void {
    this.stopAutoPlay();
    this.next.emit();
  }

  onGoToFirst(): void {
    this.stopAutoPlay();
    this.goToFirst.emit();
  }

  onGoToLast(): void {
    this.stopAutoPlay();
    this.goToLast.emit();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }
}


