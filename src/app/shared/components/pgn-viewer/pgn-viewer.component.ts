import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PgnMove {
  san: string;
  index: number;
}

@Component({
  selector: 'app-pgn-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 overflow-y-auto custom-scrollbar relative" #pgnScrollContainer>
      <div class="grid grid-cols-[2.5rem_1fr_1fr] text-[13px]">
        @for (round of moveRounds(); track round.num) {
        <div
          class="py-1.5 flex items-center justify-center font-bold opacity-20 border-r border-white/5 bg-white/5 h-full">
          {{ round.num }}</div>
        <div (click)="moveClicked.emit(round.whiteIndex)"
          class="py-1.5 px-3 cursor-pointer hover:bg-white/5 transition-all text-center h-full flex items-center justify-center"
          [class.bg-blue-600/20]="round.whiteIndex === currentMoveIndexSignal()"
          [class.active-pgn-move]="round.whiteIndex === currentMoveIndexSignal()">
          <span [class.text-blue-400]="round.whiteIndex === currentMoveIndexSignal()">{{ formatMove(round.white) }}</span>
        </div>
        <div (click)="moveClicked.emit(round.blackIndex)"
          class="py-1.5 px-3 cursor-pointer hover:bg-white/5 transition-all text-center h-full flex items-center justify-center"
          [class.bg-blue-600/20]="round.blackIndex === currentMoveIndexSignal()"
          [class.active-pgn-move]="round.blackIndex === currentMoveIndexSignal()">
          @if (round.black) {
          <span [class.text-blue-400]="round.blackIndex === currentMoveIndexSignal()">{{ formatMove(round.black) }}</span>
          }
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .active-pgn-move {
      background-color: rgba(37, 99, 235, 0.2) !important;
    }
  `]
})
export class PgnViewerComponent {
  @Input() moves: string[] = [];
  @Input() currentMoveIndex: number = -1;

  @Output() moveClicked = new EventEmitter<number>();

  currentMoveIndexSignal = signal(-1);

  constructor() {
    effect(() => {
      this.currentMoveIndexSignal.set(this.currentMoveIndex);
    });
  }

  moveRounds = computed(() => {
    const rounds: Array<{
      num: number;
      white: string;
      whiteIndex: number;
      black?: string;
      blackIndex?: number;
    }> = [];

    for (let i = 0; i < this.moves.length; i += 2) {
      const roundNum = Math.floor(i / 2) + 1;
      const white = this.moves[i];
      const black = this.moves[i + 1];

      rounds.push({
        num: roundNum,
        white,
        whiteIndex: i,
        black,
        blackIndex: i + 1
      });
    }

    return rounds;
  });

  formatMove(move: string): string {
    if (!move) return '';
    return move
      .replace(/K/g, '♔')
      .replace(/Q/g, '♕')
      .replace(/R/g, '♖')
      .replace(/B/g, '♗')
      .replace(/N/g, '♘')
      .replace(/P/g, ''); // Pawns usually don't have a symbol in SAN
  }
}