import { Component, ChangeDetectionStrategy, input, output, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chess, Move } from 'chess.js';
import { ChessBoardComponent } from '../../../../shared/components/chess/chess-board/chess-board.component';

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q';

@Component({
  selector: 'app-bughouse-board',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-board.component.html',
  styleUrl: './bughouse-board.component.css',
})
export class BughouseBoardComponent {
   boardId = input.required<'A' | 'B'>();
  fen = input.required<string>();
  orientation = input.required<'white' | 'black'>();
  pocketW = input.required<Record<PieceType, number>>();
  pocketB = input.required<Record<PieceType, number>>();
  timeW = input.required<number>();
  timeB = input.required<number>();
  turn = input.required<'w' | 'b'>();
  interactive = input.required<boolean>();
  myBoard = input.required<'A' | 'B' | null>();
  myColor = input.required<'w' | 'b' | null>();
  gameActive = input.required<boolean>();
  winner = input.required<string | null>();

  whiteName = input<string>('');
  blackName = input<string>('');

  activeDropBoard = input.required<'A' | 'B' | null>();
  activeDropPiece = input.required<PieceType | null>();
  activeDropColor = input.required<'w' | 'b' | null>();

  moveMade = output<{ move: Move; fen: string; uci?: string }>();
  startDropMode = output<{ board: 'A' | 'B'; piece: PieceType; color: 'w' | 'b' }>();
  pieceDropped = output<{ board: 'A' | 'B'; square: string; piece: PieceType; color: 'w' | 'b' }>();

  private chess = new Chess();

  constructor() {
    effect(() => {
      try {
        this.chess.load(this.fen());
      } catch (e) {
        // Safe fallback
      }
    });
  }

  // Derived properties for template
  topPocket = computed(() => this.orientation() === 'white' ? this.pocketB() : this.pocketW());
  topTime = computed(() => this.orientation() === 'white' ? this.timeB() : this.timeW());
  topColor = computed(() => this.orientation() === 'white' ? 'b' : 'w');
  topName = computed(() => this.orientation() === 'white' ? this.blackName() : this.whiteName());

  bottomPocket = computed(() => this.orientation() === 'white' ? this.pocketW() : this.pocketB());
  bottomTime = computed(() => this.orientation() === 'white' ? this.timeW() : this.timeB());
  bottomColor = computed(() => this.orientation() === 'white' ? 'w' : 'b');
  bottomName = computed(() => this.orientation() === 'white' ? this.whiteName() : this.blackName());

  // Helpers
  getPocketKeys(): PieceType[] {
    return ['q', 'r', 'b', 'n', 'p'];
  }

  getPieceLabel(type: string): string {
    const labels: Record<string, string> = {
      q: 'Queen',
      r: 'Rook',
      b: 'Bishop',
      n: 'Knight',
      p: 'Pawn',
    };
    return labels[type] || type.toUpperCase();
  }

  getPocketPieceSvg(type: PieceType, color: 'w' | 'b'): string {
    const theme = 'cburnett';
    const typeUpper = type.toUpperCase();
    return `/pieces/${theme}/${color}${typeUpper}.svg`;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const sStr = s < 10 ? '0' + s : s;
    return `${m}:${sStr}`;
  }

  getGridSquares(): string[] {
    const orientation = this.orientation();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    if (orientation === 'white') {
      ranks.reverse();
    } else {
      files.reverse();
    }

    const squares: string[] = [];
    for (const rank of ranks) {
      for (const file of files) {
        squares.push(file + rank);
      }
    }
    return squares;
  }

  isSquareTargetable(square: string): boolean {
    if (this.activeDropBoard() !== this.boardId()) return false;
    const piece = this.activeDropPiece();
    if (!piece) return false;

    if (this.chess.get(square as any)) return false;

    if (piece === 'p') {
      const rank = square[1];
      if (rank === '1' || rank === '8') return false;
    }

    return true;
  }

  onGridSquareClicked(square: string) {
    if (!this.isSquareTargetable(square)) return;
    this.pieceDropped.emit({
      board: this.boardId(),
      square,
      piece: this.activeDropPiece()!,
      color: this.activeDropColor()!,
    });
  }
}
