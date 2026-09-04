import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardThemeService } from '../../../../core/services/board-theme.service';

export interface CannibalAvailabilityItem {
  inPocket: number;
  boardSquares: string[];
  totalAvailable: number;
}

export type CannibalAvailabilityMap = Record<'q' | 'r' | 'b' | 'n', CannibalAvailabilityItem>;

@Component({
  selector: 'app-cannibal-promotion-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="cancelled.emit()"
    >
      <div
        class="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-5 text-slate-800 animate-in zoom-in-95 duration-200"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Cannibal Promotion
              </span>
              <span class="text-xs font-semibold text-slate-500">Board {{ pendingPromotion().board }}</span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mt-1">Requisition Promoted Piece</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Piece count is strictly conserved. Requisition a piece from your reserve or pluck from the opponent on Board {{ partnerBoard() }}.
            </p>
          </div>
          <button
            type="button"
            (click)="cancelled.emit()"
            class="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors hover:bg-slate-100"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Piece Selection Grid -->
        <div class="grid grid-cols-2 gap-3">
          @for (piece of pieceList; track piece.type) {
            @let info = availability()[piece.type];
            @let isSelected = selectedPiece() === piece.type;
            @let isAvailable = info.totalAvailable > 0;

            <div
              class="relative rounded-xl border p-3 flex flex-col items-center justify-between gap-2 transition-all select-none"
              [class.border-purple-600]="isSelected && isAvailable"
              [class.bg-purple-50/50]="isSelected && isAvailable"
              [class.ring-2]="isSelected && isAvailable"
              [class.ring-purple-500/20]="isSelected && isAvailable"
              [class.border-slate-200]="!isSelected && isAvailable"
              [class.hover:border-slate-300]="!isSelected && isAvailable"
              [class.hover:bg-slate-50]="!isSelected && isAvailable"
              [class.opacity-45]="!isAvailable"
              [class.bg-slate-50]="!isAvailable"
              [class.cursor-pointer]="isAvailable"
              [class.cursor-not-allowed]="!isAvailable"
              (click)="isAvailable && selectPiece(piece.type)"
            >
              <!-- Piece Image -->
              <div class="w-16 h-16 flex items-center justify-center">
                <img
                  [src]="getPieceUrl(piece.type)"
                  [alt]="piece.label"
                  class="w-14 h-14 object-contain transition-transform hover:scale-110"
                />
              </div>

              <!-- Label & Counts -->
              <div class="w-full text-center">
                <div class="font-bold text-sm text-slate-800">{{ piece.label }}</div>
                
                <!-- Availability Badges -->
                <div class="mt-1 flex flex-col gap-1 items-center">
                  @if (info.inPocket > 0) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      {{ info.inPocket }} in Reserve
                    </span>
                  }

                  @if (info.boardSquares.length > 0) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800">
                      {{ info.boardSquares.length }} on Opponent (Board {{ partnerBoard() }})
                    </span>
                  }

                  @if (info.totalAvailable === 0) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-100">
                      Unavailable
                    </span>
                  }
                </div>
              </div>

              <!-- Multiple Square Disambiguation (if selected & multiple on board) -->
              @if (isSelected && selectedSource() === 'board' && info.boardSquares.length > 1) {
                <div class="w-full mt-2 pt-2 border-t border-purple-200/60 flex flex-col items-center gap-1.5" (click)="$event.stopPropagation()">
                  <span class="text-[10px] font-bold text-purple-900 uppercase tracking-wider">Select Square from Opponent on Board {{ partnerBoard() }}:</span>
                  <div class="flex flex-wrap gap-1 justify-center">
                    @for (sq of info.boardSquares; track sq) {
                      <button
                        type="button"
                        (click)="selectedSquare.set(sq)"
                        class="px-2 py-0.5 text-xs font-bold rounded font-mono transition-all"
                        [class.bg-purple-600]="selectedSquare() === sq"
                        [class.text-white]="selectedSquare() === sq"
                        [class.bg-white]="selectedSquare() !== sq"
                        [class.text-slate-700]="selectedSquare() !== sq"
                        [class.border]="selectedSquare() !== sq"
                        [class.border-slate-300]="selectedSquare() !== sq"
                        [class.hover:bg-purple-50]="selectedSquare() !== sq"
                      >
                        {{ sq }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Source Preference Toggle (if selected piece has both pocket and board options) -->
        @let curInfo = availability()[selectedPiece()];
        @if (curInfo && curInfo.inPocket > 0 && curInfo.boardSquares.length > 0) {
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span class="font-medium text-slate-700">Source Requisition:</span>
            <div class="flex rounded-lg bg-slate-200/80 p-0.5">
              <button
                type="button"
                (click)="setSource('pocket')"
                class="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                [class.bg-white]="selectedSource() === 'pocket'"
                [class.text-slate-900]="selectedSource() === 'pocket'"
                [class.shadow-xs]="selectedSource() === 'pocket'"
                [class.text-slate-500]="selectedSource() !== 'pocket'"
              >
                Reserve ({{ curInfo.inPocket }})
              </button>
              <button
                type="button"
                (click)="setSource('board')"
                class="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                [class.bg-white]="selectedSource() === 'board'"
                [class.text-slate-900]="selectedSource() === 'board'"
                [class.shadow-xs]="selectedSource() === 'board'"
                [class.text-slate-500]="selectedSource() !== 'board'"
              >
                Pluck Opponent ({{ curInfo.boardSquares.length }})
              </button>
            </div>
          </div>
        }

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <span class="text-xs text-slate-500 italic">
            * Teammate's pieces are safe. Pluck removes the opponent's piece on Board {{ partnerBoard() }}. Promoted pawn passes to teammate's reserve.
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="cancelled.emit()"
              class="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              [disabled]="!canConfirm()"
              (click)="onConfirm()"
              class="px-5 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-purple-200"
            >
              Promote to {{ getPieceLabel(selectedPiece()) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CannibalPromotionDialogComponent {
  private boardThemeService = inject(BoardThemeService);

  pendingPromotion = input.required<{
    board: 'A' | 'B';
    from: string;
    to: string;
    color: 'w' | 'b';
  }>();

  availability = input.required<CannibalAvailabilityMap>();

  confirmed = output<{
    piece: 'q' | 'r' | 'b' | 'n';
    requisition?: { source: 'pocket' | 'board'; square?: string };
  }>();

  cancelled = output<void>();

  readonly pieceList: { type: 'q' | 'r' | 'b' | 'n'; label: string }[] = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];

  selectedPiece = signal<'q' | 'r' | 'b' | 'n'>('q');
  selectedSource = signal<'pocket' | 'board'>('pocket');
  selectedSquare = signal<string | null>(null);

  partnerBoard = computed(() => (this.pendingPromotion().board === 'A' ? 'B' : 'A'));

  constructor() {
    // Auto-select the first available piece type if queen is unavailable
    const initTimer = setTimeout(() => {
      const avail = this.availability();
      if (avail.q.totalAvailable === 0) {
        for (const p of this.pieceList) {
          if (avail[p.type].totalAvailable > 0) {
            this.selectPiece(p.type);
            break;
          }
        }
      } else {
        this.selectPiece('q');
      }
    }, 0);
  }

  selectPiece(type: 'q' | 'r' | 'b' | 'n') {
    this.selectedPiece.set(type);
    const info = this.availability()[type];

    // Pocket First default
    if (info.inPocket > 0) {
      this.selectedSource.set('pocket');
      this.selectedSquare.set(null);
    } else if (info.boardSquares.length > 0) {
      this.selectedSource.set('board');
      this.selectedSquare.set(info.boardSquares[0]);
    }
  }

  setSource(source: 'pocket' | 'board') {
    this.selectedSource.set(source);
    const info = this.availability()[this.selectedPiece()];
    if (source === 'board' && info.boardSquares.length > 0) {
      if (!this.selectedSquare() || !info.boardSquares.includes(this.selectedSquare()!)) {
        this.selectedSquare.set(info.boardSquares[0]);
      }
    } else {
      this.selectedSquare.set(null);
    }
  }

  canConfirm(): boolean {
    const piece = this.selectedPiece();
    const info = this.availability()[piece];
    if (!info || info.totalAvailable === 0) return false;

    if (this.selectedSource() === 'board') {
      return !!this.selectedSquare() && info.boardSquares.includes(this.selectedSquare()!);
    }

    return info.inPocket > 0;
  }

  onConfirm() {
    if (!this.canConfirm()) return;

    const piece = this.selectedPiece();
    const source = this.selectedSource();
    const square = source === 'board' ? (this.selectedSquare() ?? undefined) : undefined;

    this.confirmed.emit({
      piece,
      requisition: {
        source,
        square,
      },
    });
  }

  getPieceUrl(type: string): string {
    const pieceSet = this.boardThemeService.pieceSet();
    const color = this.pendingPromotion().color;
    return `/pieces/${pieceSet}/${color}${type.toUpperCase()}.svg`;
  }

  getPieceLabel(type: string): string {
    const map: Record<string, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };
    return map[type] || type.toUpperCase();
  }
}
