import { Component, Input, Output, EventEmitter, signal, computed, ViewChild, effect, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowPath, heroTrash, heroFlag, heroPlay, heroXMark } from '@ng-icons/heroicons/outline';
import { dragNewPiece } from 'chessground/drag';
import { Role, Color } from 'chessground/types';

@Component({
  selector: 'app-board-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ChessBoardComponent, NgIconComponent],
  providers: [provideIcons({ heroArrowPath, heroTrash, heroFlag, heroPlay, heroXMark })],
  template: `
    <div class="board-editor-container w-full overflow-hidden p-1">
      <div class="flex flex-row gap-4 items-start justify-center w-full">
        
        <!-- White Spare Pieces -->
        <div class="flex flex-col gap-1 p-1 bg-surface border border-base rounded-xl shadow-sm">
          @for (role of pieceRoles; track role) {
            <div 
              class="piece-slot w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-subtle rounded-lg transition-all border border-transparent hover:border-base"
              (mousedown)="onSparePieceMouseDown($event, 'white', role)"
            >
              <div [class]="getPieceClass('white', role)" class="w-6 h-6 pointer-events-none"></div>
            </div>
          }
        </div>

        <!-- Center: Board & Essential Tools -->
        <div class="flex flex-col gap-3 items-center min-w-0">
          <div class="relative aspect-square w-full max-w-[280px] board-container-parent z-10 overflow-hidden shadow-lg bg-surface border border-base rounded-lg">
            <app-chess-board
              #board
              [fen]="displayFen()"
              [orientation]="orientation"
              [interactive]="true"
              [isEditor]="true"
              (fenChange)="onBoardFenChange($event)"
            ></app-chess-board>
          </div>
          
          <!-- Compact Toolbar & Turn Selection -->
          <div class="flex flex-col gap-2 w-full max-w-[280px]">
            <!-- Turn Selection -->
            <div class="flex gap-1 p-1 bg-subtle/50 rounded-xl border border-base">
              <button 
                class="flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                [class.bg-surface]="turn() === 'w'"
                [class.shadow-sm]="turn() === 'w'"
                [class.text-accent]="turn() === 'w'"
                [class.text-muted]="turn() !== 'w'"
                (click)="turn.set('w')"
              >White to Move</button>
              <button 
                class="flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                [class.bg-surface]="turn() === 'b'"
                [class.shadow-sm]="turn() === 'b'"
                [class.text-accent]="turn() === 'b'"
                [class.text-muted]="turn() !== 'b'"
                (click)="turn.set('b')"
              >Black to Move</button>
            </div>
          </div>
        </div>

        <!-- Black Spare Pieces -->
        <div class="flex flex-col gap-1 p-1 bg-surface border border-base rounded-xl shadow-sm">
          @for (role of pieceRoles; track role) {
            <div 
              class="piece-slot w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-subtle rounded-lg transition-all border border-transparent hover:border-base"
              (mousedown)="onSparePieceMouseDown($event, 'black', role)"
            >
              <div [class]="getPieceClass('black', role)" class="w-6 h-6 pointer-events-none"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .piece-slot div {
      width: 100%;
      height: 100%;
      background-size: 85%;
      background-repeat: no-repeat;
      background-position: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    .piece-slot:hover div {
      transform: scale(1.15);
    }
    .white.pawn { background-image: url('/pieces/cburnett/wP.svg'); }
    .white.knight { background-image: url('/pieces/cburnett/wN.svg'); }
    .white.bishop { background-image: url('/pieces/cburnett/wB.svg'); }
    .white.rook { background-image: url('/pieces/cburnett/wR.svg'); }
    .white.queen { background-image: url('/pieces/cburnett/wQ.svg'); }
    .white.king { background-image: url('/pieces/cburnett/wK.svg'); }
    .black.pawn { background-image: url('/pieces/cburnett/bP.svg'); }
    .black.knight { background-image: url('/pieces/cburnett/bN.svg'); }
    .black.bishop { background-image: url('/pieces/cburnett/bB.svg'); }
    .black.rook { background-image: url('/pieces/cburnett/bR.svg'); }
    .black.queen { background-image: url('/pieces/cburnett/bQ.svg'); }
    .black.king { background-image: url('/pieces/cburnett/bK.svg'); }
  `]
})
export class BoardEditorComponent implements AfterViewInit {
  @ViewChild('board') boardComponent!: ChessBoardComponent;

  @Input() set fen(value: string) {
    this.loadFen(value);
  }
  @Input() orientation: 'white' | 'black' = 'white';
  @Output() fenChange = new EventEmitter<string>();

  boardFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  turn = signal<'w' | 'b'>('w');
  
  // Castling Rights
  whiteKingside = signal(true);
  whiteQueenside = signal(true);
  blackKingside = signal(true);
  blackQueenside = signal(true);

  pieceRoles: Role[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

  displayFen = computed(() => this.boardFen());
  
  fullFen = computed(() => {
    let castling = '';
    if (this.whiteKingside()) castling += 'K';
    if (this.whiteQueenside()) castling += 'Q';
    if (this.blackKingside()) castling += 'k';
    if (this.blackQueenside()) castling += 'q';
    if (!castling) castling = '-';
    
    return `${this.boardFen()} ${this.turn()} ${castling} - 0 1`;
  });


  constructor() {
    effect(() => {
      this.fenChange.emit(this.fullFen());
    });
  }

  ngAfterViewInit() {
    // Redraw after a delay to ensure parent sizing is captured
    setTimeout(() => {
      this.boardComponent?.api?.redrawAll();
    }, 300);
  }

  loadFen(fen: string) {
    if (!fen) return;
    const parts = fen.split(' ');
    this.boardFen.set(parts[0] || '8/8/8/8/8/8/8/8');
    this.turn.set((parts[1] as 'w' | 'b') || 'w');
    
    const castling = parts[2] || '-';
    this.whiteKingside.set(castling.includes('K'));
    this.whiteQueenside.set(castling.includes('Q'));
    this.blackKingside.set(castling.includes('k'));
    this.blackQueenside.set(castling.includes('q'));
  }

  onBoardFenChange(newBoardFen: string) {
    // Only take the board part
    const boardPart = newBoardFen.split(' ')[0];
    this.boardFen.set(boardPart);
  }

  getPieceClass(color: Color, role: Role): string {
    return `${color} ${role}`;
  }

  onSparePieceMouseDown(event: MouseEvent, color: Color, role: Role) {
    event.preventDefault();
    if (!this.boardComponent?.api) return;

    dragNewPiece(this.boardComponent.api.state, { color, role }, event, true);
  }

  resetToInitial() {
    this.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  clearBoard() {
    this.loadFen('8/8/8/8/8/8/8/8 w - - 0 1');
  }

  getPieceStyle(color: Color, role: Role) {
    // This could be used if we don't rely on global chessground styles
    return {};
  }
}
