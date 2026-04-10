import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

export interface MoveRound {
  num: number;
  white: string;
  black: string | null;
  whiteIndex: number;
  blackIndex: number;
}

@Component({
  selector: 'app-move-history',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Navigation arrows -->
      <div class="flex items-center justify-center gap-1 p-2 border-b border-border-theme">
        <app-button variant="outline" size="sm" (click)="navigate.emit(-1)" title="Start" [disabled]="currentMoveIndex() === -1">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
          </svg>
        </app-button>
        <app-button variant="outline" size="sm" (click)="navigate.emit(currentMoveIndex() - 1)" title="Previous" [disabled]="currentMoveIndex() === -1">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </app-button>
        <app-button variant="outline" size="sm" (click)="navigate.emit(currentMoveIndex() + 1)" title="Next" [disabled]="isLastMove()">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </app-button>
        <app-button variant="outline" size="sm" (click)="navigate.emit(totalMoves() - 1)" title="End" [disabled]="isLastMove()">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
          </svg>
        </app-button>
      </div>

      <!-- Moves grid -->
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="grid grid-cols-[2.5rem_1fr_1fr] text-[13px]">
          @for (round of rounds(); track round.num) {
            <div class="py-1.5 flex items-center justify-center font-bold opacity-20 border-r border-white/5 h-full">
              {{ round.num }}
            </div>
            <div
              (click)="navigate.emit(round.whiteIndex)"
              class="py-1.5 px-3 cursor-pointer hover:bg-white/5 transition-all text-center h-full flex items-center justify-center"
              [class.bg-blue-600/20]="round.whiteIndex === currentMoveIndex()"
            >
              <span [class.text-blue-400]="round.whiteIndex === currentMoveIndex()">{{ formatMove(round.white) }}</span>
            </div>
            <div
              (click)="navigate.emit(round.blackIndex)"
              class="py-1.5 px-3 cursor-pointer hover:bg-white/5 transition-all text-center h-full flex items-center justify-center"
              [class.bg-blue-600/20]="round.blackIndex === currentMoveIndex()"
            >
              @if (round.black) {
                <span [class.text-blue-400]="round.blackIndex === currentMoveIndex()">{{ formatMove(round.black) }}</span>
              }
            </div>
          }
          @if (totalMoves() === 0) {
            <div class="col-span-3 py-8 text-center text-slate-500 opacity-40 text-xs uppercase tracking-widest font-bold">
              Game Start
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class MoveHistoryComponent {
  rounds = input.required<MoveRound[]>();
  currentMoveIndex = input.required<number>();
  totalMoves = input.required<number>();
  navigate = output<number>();

  isLastMove(): boolean {
    return this.totalMoves() === 0 || this.currentMoveIndex() === this.totalMoves() - 1;
  }

  formatMove(move: string): string {
    if (!move) return '';
    return move
      .replace(/K/g, '♔')
      .replace(/Q/g, '♕')
      .replace(/R/g, '♖')
      .replace(/B/g, '♗')
      .replace(/N/g, '♘')
      .replace(/P/g, '');
  }
}
