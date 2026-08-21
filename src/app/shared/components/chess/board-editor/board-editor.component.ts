import { Component, Input, Output, EventEmitter, signal, computed, ViewChild, effect, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowPath, heroTrash, heroFlag, heroPlay, heroXMark } from '@ng-icons/heroicons/outline';
import { dragNewPiece } from 'chessground/drag';
import { Role, Color, Key } from 'chessground/types';

export type SelectedTool = 'hand' | 'trash' | { color: Color, role: Role };

@Component({
  selector: 'app-board-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ChessBoardComponent, ButtonComponent],
  providers: [provideIcons({ heroArrowPath, heroTrash, heroFlag, heroPlay, heroXMark })],
  template: `
    @if (mainBoard) {
      <!-- Dedicated Right-Column Editor Tools Stack -->
      <div class="flex flex-col gap-6 w-full p-6 bg-white rounded-xl border border-border-base/40 h-full overflow-y-auto select-none">        
        <!-- Pieces Palette -->
        <div class="flex flex-col gap-4">
          <!-- Black Pieces -->
          <div class="space-y-1.5">
            <div class="grid grid-cols-6 gap-1.5 p-1.5 bg-slate-200/30 border border-border-base rounded-xl">
              @for (role of pieceRoles; track role) {
                <button 
                  class="piece-slot w-10 h-10 flex items-center justify-center rounded-lg border-2 group cursor-pointer"
                  [class.bg-blue-600]="isToolSelected('black', role)"
                  [class.border-blue-600]="isToolSelected('black', role)"
                  [class.border-transparent]="!isToolSelected('black', role)"
                  (mousedown)="onPiecePaletteMouseDown($event, 'black', role)"
                  (click)="selectTool({color: 'black', role})"
                >
                  <div [class]="getPieceClass('black', role)" class="w-8 h-8 pointer-events-none group-hover:scale-110"></div>
                </button>
              }
            </div>
          </div>

          <!-- White Pieces -->
          <div class="space-y-1.5">
            <div class="grid grid-cols-6 gap-1.5 p-1.5 bg-slate-200/30 border border-border-base rounded-xl">
              @for (role of pieceRoles; track role) {
                <button 
                  class="piece-slot w-10 h-10 flex items-center justify-center rounded-lg border-2 group cursor-pointer"
                  [class.bg-blue-600]="isToolSelected('white', role)"
                  [class.border-blue-600]="isToolSelected('white', role)"
                  [class.border-transparent]="!isToolSelected('white', role)"
                  (mousedown)="onPiecePaletteMouseDown($event, 'white', role)"
                  (click)="selectTool({color: 'white', role})"
                >
                  <div [class]="getPieceClass('white', role)" class="w-8 h-8 pointer-events-none group-hover:scale-110"></div>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Editor Brush Action (Move / Delete) -->
        <div class="flex flex-col">
          <div class="grid grid-cols-2 gap-2">
            <button 
              appButton
              [variant]="selectedTool() === 'hand' ? 'primary' : 'outline'"
              (click)="selectTool('hand')"
              class="w-full text-sm/6"
            >
              Move / Select
            </button>
            <button 
              appButton
              [variant]="selectedTool() === 'trash' ? 'primary' : 'outline'"
              (click)="selectTool('trash')"
              class="w-full text-sm/6"
            >
              Eraser
            </button>
          </div>
        </div>

        <!-- Turn Selection -->
        <div class="flex flex-col">
          <div class="grid grid-cols-2 gap-2">
            <button 
              appButton
              [variant]="turn() === 'w' ? 'primary' : 'outline'"
              (click)="setTurn('w')"
              class="w-full text-sm/6"
            >
              White to move
            </button>
            <button 
              appButton
              [variant]="turn() === 'b' ? 'primary' : 'outline'"
              (click)="setTurn('b')"
              class="w-full text-sm/6"
            >
              Black to move
            </button>
          </div>
        </div>

        <!-- Castling rights -->
        <div class="flex flex-col">
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-slate-200/30 border border-border-base rounded-xl">
            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" [ngModel]="whiteKingside()" (ngModelChange)="whiteKingside.set($event); emitChange()" class="rounded text-blue-600 border-border-base bg-transparent focus:ring-blue-600" />
              <span>White O-O</span>
            </label>
            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" [ngModel]="whiteQueenside()" (ngModelChange)="whiteQueenside.set($event); emitChange()" class="rounded text-blue-600 border-border-base bg-transparent focus:ring-blue-600" />
              <span>White O-O-O</span>
            </label>
            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" [ngModel]="blackKingside()" (ngModelChange)="blackKingside.set($event); emitChange()" class="rounded text-blue-600 border-border-base bg-transparent focus:ring-blue-600" />
              <span>Black O-O</span>
            </label>
            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" [ngModel]="blackQueenside()" (ngModelChange)="blackQueenside.set($event); emitChange()" class="rounded text-blue-600 border-border-base bg-transparent focus:ring-blue-600" />
              <span>Black O-O-O</span>
            </label>
          </div>
        </div>

        <!-- Board Actions -->
        <div class="flex flex-col">
          <div class="grid grid-cols-2 gap-2">
            <button 
              appButton
              variant="outline"
              (click)="clearBoard()"
              class="w-full text-sm/6"
            >
              Clear board
            </button>
            <button 
              appButton
              variant="outline"
              (click)="resetToInitial()"
              class="w-full text-sm/6"
            >
              Reset board
            </button>
          </div>
        </div>
      </div>
    } @else {
      <!-- 2-Column Compact Layout with Left-Side Pieces -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full ">
        
        <!-- Column 1: Pieces + Board (8/12) -->
        <div class="lg:col-span-8 flex flex-row gap-6 items-start">
          
          <!-- Pieces (Left of Board) -->
          <div class="flex flex-col gap-8 shrink-0">
            <!-- Black Pieces -->
            <div class="space-y-2">
              <div class="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-200/30 backdrop-blur-md border border-base rounded-xl">
                @for (role of pieceRoles; track role) {
                  <button 
                    class="piece-slot w-10 h-10 flex items-center justify-center rounded-lg  border-2 group"
                    [class.bg-blue-600]="isToolSelected('black', role)"
                    [class.border-blue-600]="isToolSelected('black', role)"
                    [class.border-transparent]="!isToolSelected('black', role)"
                    (mousedown)="onPiecePaletteMouseDown($event, 'black', role)"
                    (click)="selectTool({color: 'black', role})"
                  >
                    <div [class]="getPieceClass('black', role)" class="w-8 h-8 pointer-events-none  group-hover:scale-110"></div>
                  </button>
                }
              </div>
            </div>

            <!-- White Pieces -->
            <div class="space-y-2">
              <div class="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-200/30 backdrop-blur-md border border-base rounded-xl">
                @for (role of pieceRoles; track role) {
                  <button 
                    class="piece-slot w-10 h-10 flex items-center justify-center rounded-lg  border-2 group"
                    [class.bg-blue-600]="isToolSelected('white', role)"
                    [class.border-blue-600]="isToolSelected('white', role)"
                    [class.border-transparent]="!isToolSelected('white', role)"
                    (mousedown)="onPiecePaletteMouseDown($event, 'white', role)"
                    (click)="selectTool({color: 'white', role})"
                  >
                    <div [class]="getPieceClass('white', role)" class="w-8 h-8 pointer-events-none  group-hover:scale-110"></div>
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Board Area -->
          <div 
            class="relative aspect-square w-full board-container-parent z-10 overflow-hidden"
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
              [hideCoordinates]="hideCoordinates"
              (fenChange)="onBoardFenChange($event)"
            ></app-chess-board>
          </div>
        </div>

        <!-- Column 2: Tools (4/12) -->
        <div class="lg:col-span-4 flex flex-col gap-8 pt-6">
          
          <!-- Editor Tools -->
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <button 
                appButton
                [variant]="selectedTool() === 'hand' ? 'primary' : 'outline'"
                (click)="selectTool('hand')"
              >Move</button>
              <button 
                appButton
                [variant]="selectedTool() === 'trash' ? 'primary' : 'outline'"
                (click)="selectTool('trash')"
              >Delete</button>
            </div>
          </div>

          <!-- Turn Selection -->
          <div class="space-y-3">
            <button 
              appButton
              [variant]="turn() === 'w' ? 'primary' : 'ghost'"
              (click)="setTurn('w')"
              [class.shadow-md]="turn() === 'w'"
            >White to move</button>
            <button 
              appButton
              [variant]="turn() === 'b' ? 'primary' : 'ghost'"
              (click)="setTurn('b')"
              [class.shadow-md]="turn() === 'b'"
            >Black to move</button>
          </div>

          <!-- Spacer to push content up -->
          <div class="flex-1"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
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
  @Input() mainBoard?: ChessBoardComponent;
  @ViewChild('board') private innerBoardComponent?: ChessBoardComponent;

  get boardComponent(): ChessBoardComponent | undefined {
    return this.mainBoard || this.innerBoardComponent;
  }

  @Input() set fen(value: string) {
    if (value && value !== this.fullFen()) {
      this.loadFen(value);
    }
  }
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() compact: boolean = false;
  @Input() hideCoordinates: boolean = false;
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

  public emitChange() {
    this.fenChange.emit(this.fullFen());
  }

  ngOnInit() {
    // Ensure initial state is emitted
    this.emitChange();
  }

  ngAfterViewInit() {
    // Redraw after a delay to ensure parent sizing is captured
    setTimeout(() => {
      this.boardComponent?.api?.redrawAll();
    }, 300);
  }

  loadFen(fen: string) {
    if (!fen) return;
    const parts = fen.trim().split(/\s+/);
    if (parts[0]) this.boardFen.set(parts[0]);
    if (parts[1]) this.turn.set(parts[1] as 'w' | 'b');

    if (parts[2]) {
      const castling = parts[2];
      this.whiteKingside.set(castling.includes('K'));
      this.whiteQueenside.set(castling.includes('Q'));
      this.blackKingside.set(castling.includes('k'));
      this.blackQueenside.set(castling.includes('q'));
    }
  }

  setTurn(color: 'w' | 'b') {
    this.turn.set(color);
    this.emitChange();
  }

  onBoardFenChange(newBoardFen: string) {
    // Only take the board part
    const boardPart = newBoardFen.trim().split(/\s+/)[0];
    if (boardPart !== this.boardFen()) {
      this.boardFen.set(boardPart);
      this.emitChange();
    }
  }

  getPieceClass(color: Color, role: Role): string {
    return `${color} ${role}`;
  }

  onPiecePaletteMouseDown(event: MouseEvent, color: Color, role: Role) {
    if (!this.boardComponent?.api) return;

    this.selectTool('hand'); // Temporarily revert to hand for the drag
    dragNewPiece(this.boardComponent.api.state, { color, role }, event, true);

    // Chessground's dragNewPiece doesn't trigger change event automatically in all cases
    // We listen for the end of the drag to ensure FEN is updated
    const upListener = () => {
      this.boardComponent?.onBoardChange();
      window.removeEventListener('mouseup', upListener);
      this.selectTool({ color, role });
    };
    window.addEventListener('mouseup', upListener);
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
        this.boardComponent?.setPieces(new Map([[key, undefined]]));
      } else if (typeof tool === 'object') {
        const existingPiece = api.state.pieces.get(key);
        const isSamePiece = existingPiece &&
          existingPiece.color === tool.color &&
          existingPiece.role === tool.role;

        if (isSamePiece) {
          this.boardComponent?.setPieces(new Map([[key, undefined]]));
        } else {
          this.boardComponent?.setPieces(new Map([[key, { color: tool.color, role: tool.role }]]));
        }
      }
    }
  }

  resetToInitial() {
    this.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.emitChange();
  }

  clearBoard() {
    this.loadFen('8/8/8/8/8/8/8/8 w - - 0 1');
    this.emitChange();
  }

  getPieceStyle(color: Color, role: Role) {
    // This could be used if we don't rely on global chessground styles
    return {};
  }
  getFen(): string {
    return this.fullFen();
  }
}
