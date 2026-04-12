import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

export interface MoveStep {
  san: string;
  ply: number;
  isFigurine: boolean;
}

export interface MoveRound {
  number: number;
  white: MoveStep;
  black: MoveStep | null;
}

@Component({
  selector: 'app-move-notation',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="move-notation-container  overflow-hidden">
      <!-- Navigation controls (Optional) - Strictly Fixed at Top -->
      @if (showNavigation()) {
        <div
          class="flex-none flex items-center justify-center gap-1 p-2 border-b border-border-theme backdrop-blur-lg z-20"
        >
          <app-button
            variant="outline"
            size="sm"
            (click)="navigate.emit(0)"
            title="Start"
            [disabled]="currentPly() === 0"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </app-button>
          <app-button
            variant="outline"
            size="sm"
            (click)="navigate.emit(currentPly() - 1)"
            title="Previous"
            [disabled]="currentPly() === 0"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </app-button>
          <app-button
            variant="outline"
            size="sm"
            (click)="navigate.emit(currentPly() + 1)"
            title="Next"
            [disabled]="isLastMove()"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </app-button>
          <app-button
            variant="outline"
            size="sm"
            (click)="navigate.emit(totalPlies())"
            title="End"
            [disabled]="isLastMove()"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="7 17 12 12 7 7" />
              <polyline points="14 17 19 12 14 7" />
            </svg>
          </app-button>
        </div>
      }

      <!-- Scrollable Move List -->
      <div #scrollContainer class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3">
        <table class="w-full border-collapse">
          <tbody>
            @for (round of moveRounds(); track round.number) {
              <tr
                class="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.02] last:border-0"
              >
                <td
                  class="py-2 pr-3 w-8 text-[11px] font-black text-slate-500 uppercase tracking-tighter text-right select-none"
                >
                  {{ round.number }}
                </td>

                <!-- White Move -->
                <td class="py-1 px-1">
                  @if (round.white) {
                    <div
                      [id]="'move-' + round.white.ply"
                      (click)="onMoveClick(round.white.ply)"
                      [class.active-move]="currentPly() === round.white.ply"
                      class="move-cell group/move"
                    >
                      @if (round.white.isFigurine) {
                        <span
                          class="figurine text-lg leading-none mr-1 opacity-70 group-hover/move:opacity-100 transition-opacity"
                        >
                          {{ getPieceIcon(round.white.san) }}
                        </span>
                        <span class="san transition-colors">
                          {{ getCleanSan(round.white.san) }}
                        </span>
                      } @else {
                        <span class="san transition-colors">
                          {{ round.white.san }}
                        </span>
                      }
                    </div>
                  }
                </td>

                <!-- Black Move -->
                <td class="py-1 px-1">
                  @if (round.black) {
                    <div
                      [id]="'move-' + round.black.ply"
                      (click)="onMoveClick(round.black.ply)"
                      [class.active-move]="currentPly() === round.black.ply"
                      class="move-cell group/move"
                    >
                      @if (round.black.isFigurine) {
                        <span
                          class="figurine text-lg leading-none mr-1 opacity-70 group-hover/move:opacity-100 transition-opacity"
                        >
                          {{ getPieceIcon(round.black.san) }}
                        </span>
                        <span class="san">
                          {{ getCleanSan(round.black.san) }}
                        </span>
                      } @else {
                        <span class="san">
                          {{ round.black.san }}
                        </span>
                      }
                    </div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (totalPlies() === 0) {
          <div
            class="h-full flex flex-col items-center justify-center text-slate-500 opacity-40 py-10"
          >
            <svg
              class="w-10 h-10 mb-3 opacity-20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M12 8V12L15 15" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <p class="text-[10px] uppercase font-black tracking-widest text-center">
              No moves played
            </p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        width: 100%;
        overflow: hidden;
      }

      .move-notation-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        width: 100%;
      }

      .move-cell {
        padding: 0.4rem 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        border: 1px solid transparent;
      }

      .move-cell:hover {
        background-color: rgba(34, 211, 238, 0.05); /* cyan-400/5 */
        border-color: rgba(34, 211, 238, 0.1);
      }

      .active-move {
        background-color: rgba(34, 211, 238, 0.15); /* cyan-400/15 */
        border-color: rgba(34, 211, 238, 0.3);
        box-shadow: 0 0 15px rgba(34, 211, 238, 0.1);
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(34, 211, 238, 0.2);
      }
    `,
  ],
})
export class MoveNotationComponent {
  // Input: List of SAN moves
  moves = input.required<string[]>();
  // Input: Current ply (0 = start, 1 = move 1, etc.)
  currentPly = input<number>(0);
  // Input: Show navigation controls
  showNavigation = input<boolean>(false);

  // Outputs
  navigate = output<number>();
  moveClicked = output<number>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Computed: Total plies in the game
  totalPlies = computed(() => this.moves().length);

  constructor() {
    // Auto-scroll effect
    effect(() => {
      const ply = this.currentPly();
      if (ply > 0) {
        this.scrollToIndex(ply);
      }
    });
  }

  // Computed: Group moves into rounds (for the table view)
  moveRounds = computed(() => {
    const rounds: MoveRound[] = [];
    const currentMoves = this.moves();

    for (let i = 0; i < currentMoves.length; i += 2) {
      rounds.push({
        number: Math.floor(i / 2) + 1,
        white: {
          san: currentMoves[i],
          // Ply is i + 1
          ply: i + 1,
          isFigurine: this.isFigurine(currentMoves[i]),
        },
        black:
          i + 1 < currentMoves.length
            ? {
                san: currentMoves[i + 1],
                // Ply is i + 2
                ply: i + 2,
                isFigurine: this.isFigurine(currentMoves[i + 1]),
              }
            : null,
      });
    }
    return rounds;
  });

  isLastMove(): boolean {
    return this.currentPly() === this.totalPlies();
  }

  onMoveClick(ply: number) {
    this.moveClicked.emit(ply);
    this.navigate.emit(ply);
  }

  isFigurine(san: string): boolean {
    return /^[KQRBN]/.test(san);
  }

  getPieceIcon(san: string): string {
    const piece = san[0];
    const icons: Record<string, string> = {
      K: '♔',
      Q: '♕',
      R: '♖',
      B: '♗',
      N: '♘',
    };
    return icons[piece] || '';
  }

  getCleanSan(san: string): string {
    return san.replace(/^[KQRBN]/, '');
  }

  private scrollToIndex(ply: number) {
    if (!this.scrollContainer) return;

    // Use setTimeout to allow DOM to catch up
    setTimeout(() => {
      const element = document.getElementById(`move-${ply}`);
      if (element && this.scrollContainer) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}
