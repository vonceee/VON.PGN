import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  inject,
  PLATFORM_ID,
  HostListener,
  signal,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Chess, Move } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Key, MoveMetadata } from 'chessground/types';
import { AudioService } from '../../../../core/services/audio.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [FormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <div class="board-resize-wrapper" [style.width.px]="boardSize">
      <div class="board-container-wrapper relative">
        <div #boardEl class="board-container"></div>

        <!-- Promotion Overlay -->
        @if (pendingPromotion(); as p) {
          <div class="absolute inset-0 z-40 bg-black/20" (click)="cancelPromotion()"></div>

          <div
            class="absolute inset-0 z-50 flex items-center justify-center transition-all animate-in fade-in zoom-in duration-150"
          >
            <div
              class="promotion-menu p-4 bg-slate-900 border border-slate-700 rounded-2xl  flex gap-4"
              (click)="$event.stopPropagation()"
            >
              @for (piece of promotionPieces; track piece.type) {
                <button
                  (click)="selectPromotion(piece.type)"
                  class="w-20 h-20 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all active:scale-90"
                >
                  <span class="text-3xl font-black text-white uppercase">{{ piece.type }}</span>
                </button>
              }
            </div>
          </div>
        }

        @if (resizable) {
          <div
            class="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end z-10"
            style="touch-action: none"
            (mousedown)="startResize($event)"
            (touchstart)="startResize($event)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              class="text-slate-400 opacity-50 hover:opacity-100 transition-opacity"
            >
              <path
                d="M11 11H9.5V9.5H11V11ZM11 7.5H9.5V6H11V7.5ZM7.5 11H6V9.5H7.5V11Z"
                fill="currentColor"
              />
            </svg>
          </div>
        }
      </div>

      @if (showControls) {
        <div class="board-controls">
          <input
            type="range"
            [min]="minSize"
            [max]="maxSize"
            [(ngModel)]="boardSize"
            (ngModelChange)="onSliderResize($event)"
            class="resize-slider"
            title="Board size"
          />
          <span class="size-label">{{ boardSize }}px</span>
          <button
            (click)="resetBoard()"
            class="p-2 border border-border-theme rounded hover:bg-cyan-400/20 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Reset to starting position"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .board-resize-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        container-type: inline-size;
        max-width: 100%;
      }
      .board-container-wrapper {
        width: 100%;
        aspect-ratio: 1 / 1;
      }
      .board-container {
        width: 100%;
        height: 100%;
      }
      .board-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0 0.5rem;
      }
      .resize-slider {
        flex: 1;
        height: 4px;
        accent-color: rgb(34, 211, 238);
        cursor: pointer;
      }
      .size-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: rgb(148, 163, 184);
        min-width: 45px;
        text-align: right;
        user-select: none;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
          monospace;
      }
      .promotion-menu {
        transform: translateY(0);
        animation: promo-slide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes promo-slide {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ChessBoardComponent implements AfterViewInit, OnInit, OnChanges, OnDestroy {
  @ViewChild('boardEl') boardEl!: ElementRef<HTMLDivElement>;

  @Input() fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() interactive: boolean = true;
  @Input() size: number = 400;
  @Input() minSize: number = 240;
  @Input() maxSize: number = 1000;
  @Input() showControls: boolean = false;
  @Input() resizable: boolean = true;
  @Input() storageKey: string | null = null;
  @Input() syncedShapes: any[] = [];
  @Input() configOverride: Config | null = null;
  @Input() preMoveEnabled: boolean = true;

  @Output() fenChange = new EventEmitter<string>();
  @Output() moveMade = new EventEmitter<{ from: string; to: string; san: string; fen: string }>();
  @Output() sizeChange = new EventEmitter<number>();
  @Output() shapeDrawn = new EventEmitter<any[]>();
  @Output() preMoveCancelled = new EventEmitter<void>();

  boardSize: number = 400;
  private cgApi!: Api;
  private chess = new Chess();
  private initialized = false;
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);

  // Promotion state
  pendingPromotion = signal<{ from: Key; to: Key; color: 'w' | 'b' } | null>(null);
  readonly promotionPieces = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];

  // Resize state
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartSize = 0;
  


  ngOnInit() {
    this.loadPersistedSize();
    this.sizeChange.emit(this.boardSize);
  }

  private loadPersistedSize() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.storageKey) {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= this.minSize && size <= this.maxSize) {
          this.boardSize = size;
          return;
        }
      }
    }
    this.boardSize = this.size;
  }

  private savePersistedSize() {
    if (isPlatformBrowser(this.platformId) && this.storageKey) {
      localStorage.setItem(this.storageKey, this.boardSize.toString());
    }
  }

  ngAfterViewInit() {
    this.initBoard();
  }

  ngOnChanges(changes: SimpleChanges) {
    // 1. Always sync internal chess instance first if FEN changed
    if (changes['fen']) {
      const currentFen = this.chess.fen();
      if (this.fen && this.fen !== currentFen) {
        this.chess.load(this.fen);
      }
    }

    if (this.initialized) {
      if (changes['fen'] && !changes['fen'].isFirstChange()) {
        this.syncBoard();
      }
      if (changes['orientation'] && !changes['orientation'].isFirstChange()) {
        this.cgApi.set({ orientation: this.orientation });
      }
      if (changes['size'] && !changes['size'].isFirstChange()) {
        this.boardSize = this.size;
        setTimeout(() => this.cgApi?.redrawAll());
      }
      if (changes['syncedShapes'] && !changes['syncedShapes'].isFirstChange()) {
        this.cgApi.set({ drawable: { shapes: this.syncedShapes } });
      }
      if (changes['preMoveEnabled'] && !changes['preMoveEnabled'].isFirstChange()) {
        this.syncBoard();
      }
      if (changes['interactive']) {
        this.syncBoard();
      }
      if (changes['configOverride']) {
        this.applyConfigOverride(this.configOverride || {});
      }
    }
  }

  ngOnDestroy() {
    this.cgApi?.destroy();
    this.removeResizeListeners();
  }

  undoMove() {
    this.chess.undo();
    this.syncBoard();
    this.fenChange.emit(this.chess.fen());
  }

  private initBoard() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Wait 50ms to ensure the DOM layout is stable for Chessground
    setTimeout(() => {
      if (!this.boardEl) return;
      
      this.chess.load(this.fen);

      const config: Config = {
        fen: this.fen,
        orientation: this.orientation,
        coordinates: true,
        movable: {
          free: false,
          color: this.interactive ? 'both' : undefined,
          dests: this.interactive ? this.getLegalMoves() : new Map(),
          showDests: true,
          events: {
            after: (orig: Key, dest: Key, meta: MoveMetadata) => this.onMove(orig, dest, meta),
          },
        },
        premovable: {
          enabled: this.preMoveEnabled && this.interactive,
          showDests: true,
        },
        draggable: {
          enabled: this.interactive,
          showGhost: true,
        },
        selectable: {
          enabled: this.interactive,
        },
        drawable: {
          enabled: true,
          onChange: () => this.onShapesChanged(),
        },
      };

      this.cgApi = Chessground(this.boardEl.nativeElement, config);
      this.initialized = true;

      // Apply any overrides that were set before initialization finished
      if (this.configOverride) {
        this.applyConfigOverride(this.configOverride);
      }
      
      // Ensure the board is in sync with the current (potentially updated) FEN
      this.syncBoard();
    }, 50);
  }

  private applyConfigOverride(override: Config) {
    if (!this.cgApi) return;

    const currentMovable = this.cgApi.state.movable;
    const finalConfig = { ...override };

    if (override.movable) {
      finalConfig.movable = {
        ...currentMovable,
        ...override.movable,
      };

      if (!finalConfig.movable.dests && this.interactive) {
        finalConfig.movable.dests = this.getLegalMoves();
      }
    }

    this.cgApi.set(finalConfig);
  }

  private syncBoard() {
    if (!this.cgApi) return;
    
    // Safety check: only update Chessground if the FEN is different or we are forced to
    const targetFen = this.chess.fen();
    
    this.cgApi.set({
      fen: targetFen,
      turnColor: this.turnColor(),
      movable: {
        color: this.interactive ? 'both' : undefined,
        dests: this.interactive ? this.getLegalMoves() : new Map(),
        showDests: true,
      },
      selectable: {
        enabled: this.interactive,
      },
      draggable: {
        enabled: this.interactive,
      },
      check: this.chess.inCheck() ? this.turnColor() : undefined,
      premovable: {
        enabled: this.preMoveEnabled && this.interactive,
      },
      drawable: {
        shapes: this.syncedShapes,
      },
    });

    if (this.configOverride) {
      this.applyConfigOverride(this.configOverride);
    }
  }

  playPremove(): boolean {
    if (!this.cgApi) return false;
    // Safety: ensure local chess engine is in sync with the current FEN before execution
    this.chess.load(this.fen);
    return this.cgApi.playPremove();
  }

  cancelPremove(): void {
    if (!this.cgApi) return;
    this.cgApi.cancelPremove();
  }

  private turnColor(): 'white' | 'black' {
    return this.chess.turn() === 'w' ? 'white' : 'black';
  }

  private getLegalMoves(): Map<Key, Key[]> {
    const dests = new Map<Key, Key[]>();
    this.chess.moves({ verbose: true }).forEach((m) => {
      const from = m.from as Key;
      const to = m.to as Key;
      const list = dests.get(from) || [];
      list.push(to);
      dests.set(from, list);
    });
    return dests;
  }

  private onMove(orig: Key, dest: Key, meta?: MoveMetadata) {
    // Only return if it's a pre-move being SET (opponent's turn).
    // If it's our turn, we want to allow moves even if meta.premove is true (triggered by playPremove).
    const isMyTurn = this.turnColor() === this.orientation;
    if (meta?.premove && !isMyTurn) return;

    // Check if this move is a promotion
    const isPromotion = this.isPromotionMove(orig, dest);

    if (isPromotion) {
      this.pendingPromotion.set({
        from: orig,
        to: dest,
        color: this.chess.turn(),
      });
      return;
    }

    this.completeMove(orig, dest);
  }

  private isPromotionMove(orig: Key, dest: Key): boolean {
    const piece = this.chess.get(orig as any);
    if (!piece || piece.type !== 'p') return false;
    return (piece.color === 'w' && dest[1] === '8') || (piece.color === 'b' && dest[1] === '1');
  }

  private completeMove(from: Key, to: Key, promotion: string = 'q') {
    try {
      const move = this.chess.move({ from, to, promotion: promotion as any });
      if (move) {
        this.audioService.playMoveSound(move.san);
        this.syncBoard();
        this.fenChange.emit(this.chess.fen());
        this.moveMade.emit({
          from,
          to,
          san: move.san,
          fen: this.chess.fen(),
        });
      }
    } catch (e) {
      this.syncBoard();
    }
  }

  selectPromotion(type: string) {
    const p = this.pendingPromotion();
    if (p) {
      this.completeMove(p.from, p.to, type);
      this.pendingPromotion.set(null);
    }
  }

  cancelPromotion() {
    this.pendingPromotion.set(null);
    this.syncBoard();
  }

  getPieceClass(type: string, color: 'w' | 'b'): string {
    const typeMap: Record<string, string> = {
      q: 'queen',
      r: 'rook',
      b: 'bishop',
      n: 'knight',
    };
    const colorName = color === 'w' ? 'white' : 'black';
    return `${typeMap[type]} ${colorName}`;
  }

  private onShapesChanged() {
    if (this.cgApi) {
      const shapes = this.cgApi.state.drawable.shapes;
      this.shapeDrawn.emit(shapes);
    }
  }

  resetBoard() {
    this.chess.reset();
    this.syncBoard();
    this.fenChange.emit(this.chess.fen());
  }

  onSliderResize(size: number) {
    this.boardSize = size;
    this.savePersistedSize();
    this.sizeChange.emit(size);
    setTimeout(() => this.cgApi?.redrawAll());
  }

  // --- Resizing Logic (Drag) ---

  startResize(event: MouseEvent | TouchEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;

    event.preventDefault();
    this.isResizing = true;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    this.resizeStartX = clientX;
    this.resizeStartSize = this.boardSize;

    document.addEventListener('mousemove', this.handleResize);
    document.addEventListener('mouseup', this.stopResize);
    document.addEventListener('touchmove', this.handleTouchResize);
    document.addEventListener('touchend', this.stopResize);
  }

  private handleResize = (event: MouseEvent): void => {
    if (!this.isResizing) return;
    const delta = event.clientX - this.resizeStartX;
    this.updateSizeWithDelta(delta);
  };

  private handleTouchResize = (event: TouchEvent): void => {
    if (!this.isResizing || !event.touches.length) return;
    const delta = event.touches[0].clientX - this.resizeStartX;
    this.updateSizeWithDelta(delta);
  };

  private updateSizeWithDelta(delta: number) {
    const dynamicMax = Math.min(this.maxSize, window.innerWidth * 0.95, window.innerHeight * 0.85);
    const newSize = Math.min(dynamicMax, Math.max(this.minSize, this.resizeStartSize + delta));
    this.boardSize = newSize;
    this.sizeChange.emit(this.boardSize);
    this.cgApi?.redrawAll();
  }

  private stopResize = (): void => {
    this.isResizing = false;
    this.savePersistedSize();
    this.removeResizeListeners();
  };

  private removeResizeListeners() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.stopResize);
      document.removeEventListener('touchmove', this.handleTouchResize);
      document.removeEventListener('touchend', this.stopResize);
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    const dynamicMax = Math.min(this.maxSize, window.innerWidth * 0.95, window.innerHeight * 0.85);
    if (this.boardSize > dynamicMax) {
      this.boardSize = dynamicMax;
      this.cgApi?.redrawAll();
    }
  }
}

