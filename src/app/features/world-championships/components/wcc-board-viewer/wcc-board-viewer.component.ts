import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from '@shared/chess';

/**
 * Modular Chessboard & Navigation Controls Component.
 * 
 * WHY: Encapsulates the interactive right-column layout from the reference image,
 *      providing synchronized controls across both the reader page and the editor live preview.
 */
@Component({
  selector: 'app-wcc-board-viewer',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <!-- Chessboard Container -->
      <div class="w-full aspect-square flex items-center justify-center relative rounded-xl overflow-hidden mb-4">
        <app-chess-board
          [fen]="fen()"
          [orientation]="orientation()"
          [interactive]="false"
          [resizable]="false"
          [fluid]="true"
          [hideCoordinates]="false"
        ></app-chess-board>
      </div>

      <!-- Navigation Bar matching reference layout: |<  <  Start / Move  >  >| -->
      <div class="flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70">
        <!-- First Move Button |< -->
        <button
          type="button"
          (click)="goToFirst.emit()"
          [disabled]="currentPly() === 0"
          class="p-1.5 text-gray-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Start / First move"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.75 4.5v15m-13.5-7.5 7.5-7.5v15l-7.5-7.5Z" />
          </svg>
        </button>

        <!-- Previous Move Button < -->
        <button
          type="button"
          (click)="prev.emit()"
          [disabled]="currentPly() === 0"
          class="p-1.5 text-gray-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Previous move"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        <!-- Current Move / Annotation Label in Center -->
        <div class="flex-1 text-center font-medium text-xs sm:text-sm text-slate-900 select-none truncate px-1">
          {{ moveLabel() }}
        </div>

        <!-- Next Move Button > -->
        <button
          type="button"
          (click)="next.emit()"
          [disabled]="currentPly() === maxPly()"
          class="p-1.5 text-gray-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Next move"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <!-- Last Move Button >| -->
        <button
          type="button"
          (click)="goToLast.emit()"
          [disabled]="currentPly() === maxPly()"
          class="p-1.5 text-gray-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Last move"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 4.5v15m13.5-7.5-7.5-7.5v15l7.5-7.5Z" />
          </svg>
        </button>
      </div>

      <!-- Half-moves Counter: 0 / 33 & Flip Board Button -->
      <div class="flex items-center justify-between mt-3 px-1 text-xs text-gray-500">
        <div class="font-mono text-center flex-1">
          {{ currentPly() }} / {{ maxPly() }}
        </div>

        <button
          type="button"
          (click)="flip.emit()"
          class="p-1 text-gray-500 hover:text-slate-900 transition-colors cursor-pointer"
          title="Flip board orientation"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class WccBoardViewerComponent {
  fen = input.required<string>();
  orientation = input<'white' | 'black'>('white');
  currentPly = input<number>(0);
  maxPly = input<number>(0);
  moveLabel = input<string>('Start');

  goToFirst = output<void>();
  prev = output<void>();
  next = output<void>();
  goToLast = output<void>();
  flip = output<void>();
}
