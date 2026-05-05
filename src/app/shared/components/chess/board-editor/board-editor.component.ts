import { Component, Input, Output, EventEmitter, signal, computed, ViewChild, effect, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowPath, heroTrash, heroFlag, heroPlay, heroXMark } from '@ng-icons/heroicons/outline';
import { dragNewPiece } from 'chessground/drag';
import { Role, Color, Key } from 'chessground/types';

export type SelectedTool = 'hand' | 'trash' | { color: Color, role: Role };

@Component({
  selector: 'app-board-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ChessBoardComponent],
  providers: [provideIcons({ heroArrowPath, heroTrash, heroFlag, heroPlay, heroXMark })],
  template: `
    <div class="board-editor-container w-full overflow-hidden p-1 select-none">
      <div class="flex flex-row items-center justify-center gap-6 w-full">
        
        <!-- Left: Board flanked by Piece Palettes -->
        <div class="flex flex-row items-center gap-3">
          <!-- White Pieces Palette (Vertical) -->
          <div class="flex flex-col gap-1 p-2 bg-surface border border-base rounded-xl shadow-sm">
            @for (role of pieceRoles; track role) {
              <button 
                class="piece-slot w-7 h-7 flex items-center justify-center rounded-lg transition-all border-2 group"
                [class.bg-accent/10]="isToolSelected('white', role)"
                [class.border-accent]="isToolSelected('white', role)"
                [class.border-transparent]="!isToolSelected('white', role)"
                (mousedown)="onPiecePaletteMouseDown($event, 'white', role)"
                (click)="selectTool({color: 'white', role})"
              >
                <div [class]="getPieceClass('white', role)" class="w-5 h-5 pointer-events-none transition-transform group-hover:scale-110"></div>
              </button>
            }
          </div>

          <!-- Board -->
          <div 
            class="relative aspect-square w-full max-w-[180px] board-container-parent z-10 overflow-hidden shadow-lg bg-surface border border-base rounded-lg"
            [style.cursor]="getBoardCursor()"
            (mousedown)="onBoardMouseDown($event)"
            (mousemove)="onBoardMouseMove($event)"
            (mouseup)="onBoardMouseUp()"
            (mouseleave)="onBoardMouseUp()"
          >
            <app-chess-board
              #board
              [fen]="displayFen()"
              [orientation]="orientation"
              [interactive]="true"
              [isEditor]="true"
              (fenChange)="onBoardFenChange($event)"
            ></app-chess-board>
          </div>

          <!-- Black Pieces Palette (Vertical) -->
          <div class="flex flex-col gap-1 p-1 bg-surface border border-base rounded-xl shadow-sm">
            @for (role of pieceRoles; track role) {
              <button 
                class="piece-slot w-7 h-7 flex items-center justify-center rounded-lg transition-all border-2 group"
                [class.bg-accent/10]="isToolSelected('black', role)"
                [class.border-accent]="isToolSelected('black', role)"
                [class.border-transparent]="!isToolSelected('black', role)"
                (mousedown)="onPiecePaletteMouseDown($event, 'black', role)"
                (click)="selectTool({color: 'black', role})"
              >
                <div [class]="getPieceClass('black', role)" class="w-5 h-5 pointer-events-none transition-transform group-hover:scale-110"></div>
              </button>
            }
          </div>
        </div>

        <!-- Right: Controls Section -->
        <div class="flex flex-col gap-4">
          <!-- Editor Tools Pills -->
          <div class="flex flex-col gap-2">
            <h3 class="text-xs font-bold text-muted uppercase tracking-wider">Tools</h3>
            <div class="flex flex-col gap-2">
              <div class="flex gap-2">
                <button 
                  (click)="selectTool('hand')"
                  class="flex-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border"
                  [class]="selectedTool() === 'hand' ? 'bg-black text-white border-black' : 'bg-white text-black border-base hover:bg-subtle'"
                >Move</button>
                <button 
                  (click)="selectTool('trash')"
                  class="flex-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border"
                  [class]="selectedTool() === 'trash' ? 'bg-black text-white border-black' : 'bg-white text-black border-base hover:bg-subtle'"
                >Delete</button>
              </div>
              <div class="flex gap-2">
                <button 
                  (click)="resetToInitial()"
                  class="flex-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border bg-white text-black border-base hover:bg-subtle"
                >Init</button>
                <button 
                  (click)="clearBoard()"
                  class="flex-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border bg-white text-black border-base hover:bg-subtle"
                >Clear</button>
              </div>
            </div>
          </div>

          <!-- Turn Selection Pills -->
          <div class="flex flex-col gap-2">
            <h3 class="text-xs font-bold text-muted uppercase tracking-wider">Turn</h3>
            <div class="flex gap-2">
              <button 
                (click)="turn.set('w')"
                class="flex-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border"
                [class]="turn() === 'w' ? 'bg-black text-white border-black' : 'bg-white text-black border-base hover:bg-subtle'"
              >White</button>
              <button 
                (click)="turn.set('b')"
                class="flex-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border"
                [class]="turn() === 'b' ? 'bg-black text-white border-black' : 'bg-white text-black border-base hover:bg-subtle'"
              >Black</button>
            </div>
          </div>
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

  selectedTool = signal<SelectedTool>('hand');
  private isMouseDown = false;
  private lastKey: Key | null = null;

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

  onPiecePaletteMouseDown(event: MouseEvent, color: Color, role: Role) {
    // If user starts dragging from the palette, we use Chessground's dragNewPiece
    // This allows both clicking to select a tool AND dragging to place a single piece
    event.preventDefault();
    if (!this.boardComponent?.api) return;

    this.selectTool('hand'); // Temporarily revert to hand for the drag
    dragNewPiece(this.boardComponent.api.state, { color, role }, event, true);

    // After drag finishes (on mouseup), we want to select the piece tool
    const upHandler = () => {
      this.selectTool({ color, role });
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mouseup', upHandler);
  }

  selectTool(tool: SelectedTool) {
    this.selectedTool.set(tool);
    this.updateBoardConfig();
  }

  isToolSelected(color: Color, roleOrHand: Role | 'hand'): boolean {
    const current = this.selectedTool();
    if (roleOrHand === 'hand') return current === 'hand';
    if (typeof current === 'string') return false;
    return current.color === color && current.role === roleOrHand;
  }

  private updateBoardConfig() {
    if (!this.boardComponent?.api) return;
    const tool = this.selectedTool();
    
    this.boardComponent.api.set({
      draggable: {
        enabled: tool === 'hand'
      },
      selectable: {
        enabled: tool === 'hand'
      }
    });
  }

  getBoardCursor(): string {
    const tool = this.selectedTool();
    if (tool === 'hand') return 'default';
    if (tool === 'trash') return 'crosshair';
    return 'copy';
  }

  onBoardMouseDown(event: MouseEvent) {
    if (this.selectedTool() === 'hand') return;
    this.isMouseDown = true;
    this.handleToolAction(event);
  }

  onBoardMouseMove(event: MouseEvent) {
    if (!this.isMouseDown || this.selectedTool() === 'hand') return;
    this.handleToolAction(event);
  }

  onBoardMouseUp() {
    this.isMouseDown = false;
    this.lastKey = null;
  }

  private handleToolAction(event: MouseEvent) {
    const api = this.boardComponent?.api;
    if (!api) return;

    const pos: [number, number] = [event.clientX, event.clientY];
    const key = api.getKeyAtDomPos(pos);
    
    if (key && key !== this.lastKey) {
      this.lastKey = key;
      const tool = this.selectedTool();
      
      if (tool === 'trash') {
        api.setPieces(new Map([[key, undefined]]));
      } else if (typeof tool === 'object') {
        api.setPieces(new Map([[key, { color: tool.color, role: tool.role }]]));
      }
    }
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
