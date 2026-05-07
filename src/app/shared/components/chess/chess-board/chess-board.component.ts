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
  input,
  PLATFORM_ID,
  HostListener,
  signal,
  NO_ERRORS_SCHEMA,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Chess, Move } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Key, MoveMetadata, Piece } from 'chessground/types';
import { AudioService } from '../../../../core/services/audio.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [FormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="board-resize-wrapper">
      <div class="board-container-wrapper relative">
        <div #boardEl class="board-container">
          <div class="absolute inset-0 flex items-center justify-center text-muted opacity-20 pointer-events-none">
            {{ isEditor ? 'Editor Board' : 'Loading...' }}
          </div>
        </div>

        <!-- Promotion Overlay -->
        @if (pendingPromotion(); as p) {
          <div class="absolute inset-0 z-40 bg-black/20" (click)="cancelPromotion()"></div>

          <div
            class="absolute inset-0 z-50 flex items-center justify-center transition-all animate-in fade-in zoom-in duration-150"
          >
            <div
              class="promotion-menu p-4 bg-surface border border-border-base rounded-2xl shadow-2xl flex gap-4"
              (click)="$event.stopPropagation()"
            >
              @for (piece of promotionPieces; track piece.type) {
                <button
                  (click)="selectPromotion(piece.type)"
                  class="w-20 h-20 flex items-center justify-center rounded-xl bg-subtle hover:bg-surface border border-border-base transition-all active:scale-90"
                >
                  <span class="text-3xl font-black text-content uppercase">{{ piece.type }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Resize Handle -->
        <div
          class="board-resize-handle"
          (mousedown)="startResizing($event)"
          (touchstart)="startResizing($event)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="21" y1="3" x2="3" y2="21"></line>
            <line x1="21" y1="12" x2="12" y2="21"></line>
          </svg>
        </div>

        <!-- Glyphs Layer -->
        <div class="absolute inset-0 pointer-events-none z-20">
          @for (g of glyphs(); track g.square + g.symbol) {
            <div 
              class="w-[30px] h-[30px] aspect-square rounded-full border-2 border-white dark:border-surface text-white -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center box-border shadow-xl transition-all duration-300 absolute"
              [class.bg-[var(--color-annotation-good)]]="g.class === 'good' || g.class === 'brilliant'"
              [class.bg-[var(--color-annotation-bad)]]="g.class === 'mistake' || g.class === 'blunder'"
              [class.bg-[var(--color-annotation-interesting)]]="g.class === 'interesting' || g.class === 'dubious' || g.class === 'only-move' || g.class === 'zugzwang'"
              [style]="getGlyphStyle(g.square)"
            >
              <span class="text-[14px] leading-none font-extrabold [text-shadow:_0_1px_2px_rgba(0,0,0,0.2)]">
                {{ g.symbol }}
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .board-resize-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        container-type: inline-size;
        max-width: 100%;
        width: var(--board-size, 100%);
        height: var(--board-size, auto);
        cursor: default;
      }
      .board-container-wrapper {
        width: 100%;
        aspect-ratio: 1 / 1;
        padding-left: var(--board-gutter, 32px);
        padding-bottom: var(--board-gutter, 32px);
        box-sizing: border-box;
      }
      .board-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: visible;
      }

      /* Coordinate Overrides */
      .cg-wrap {
        overflow: visible !important;
      }

      .cg-wrap coords {
        color: #000 !important;
        font-weight: 800 !important;
        font-size: 12px !important;
        font-family: var(--font-sans) !important;
        pointer-events: none !important;
        text-transform: uppercase !important;
      }

      .dark .cg-wrap coords {
        color: #fff !important;
      }

      .cg-wrap coords.ranks {
        left: -32px !important;
        width: 32px !important;
        display: flex !important;
        flex-direction: column-reverse !important;
        right: auto !important;
      }

      .cg-wrap.orientation-black coords.ranks {
        flex-direction: column !important;
      }

      .cg-wrap coords.files {
        bottom: -32px !important;
        left: 0 !important;
        height: 32px !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: row !important; /* Default for White: a..h -> a at left */
        top: auto !important;
      }

      .cg-wrap.orientation-black coords.files {
        flex-direction: row-reverse !important; /* For Black: a..h -> h at left */
      }

      .cg-wrap coords.ranks coord,
      .cg-wrap coords.files coord {
        color: inherit !important;
        text-shadow: none !important;
        background: none !important;
        line-height: 1 !important;
        position: static !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 1 !important;
      }

      .cg-wrap coords.ranks coord {
        justify-content: center !important;
      }

      .cg-wrap coords.files coord {
        align-items: center !important;
      }

      .promotion-menu {
        transform: translateY(0);
        animation: promo-slide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .board-resize-handle {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 16px;
        height: 16px;
        cursor: nwse-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-muted);
        opacity: 0.4;
        z-index: 20;
        transition: opacity 0.2s;
      }

      .board-resize-handle svg {
        width: 14px;
        height: 14px;
        transform: rotate(0deg);
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
  host: {
    class: 'block w-full h-full'
  },
})
export class ChessBoardComponent implements AfterViewInit, OnInit, OnChanges, OnDestroy {
  @ViewChild('boardEl') boardEl!: ElementRef<HTMLDivElement>;

  @Input() fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() interactive: boolean = true;
  @Input() minSize: number = 240;
  @Input() maxSize: number = 1000;
  @Input() syncedShapes: any[] = [];
  @Input() configOverride: Config | null = null;
  @Input() preMoveEnabled: boolean = true;
  @Input() isEditor: boolean = false;
  @Input() hideCoordinates: boolean = false;
  @Input() lastMove: Key[] | undefined = undefined;
  glyphs = input<{ square: string; symbol: string; class: string }[]>([]);

  @Output() fenChange = new EventEmitter<string>();
  @Output() moveMade = new EventEmitter<{ move: Move; fen: string }>();
  @Output() sizeChange = new EventEmitter<number>();
  @Output() shapeDrawn = new EventEmitter<any[]>();
  @Output() preMoveCancelled = new EventEmitter<void>();
  @Output() prevMove = new EventEmitter<void>();
  @Output() nextMove = new EventEmitter<void>();

  // Sizing State
  boardSize: number = 400;
  private containerSize: { width: number; height: number } = { width: 800, height: 800 };
  private resizeObserver: ResizeObserver | null = null;
  private readonly STORAGE_KEY = 'von-chess.board-size';
  private manualSize = signal<number | null>(null);
  public isResizing = signal(false);
  private lastScrollTime = 0;
  private readonly SCROLL_THROTTLE = 80;

  public get api(): Api { return this.cgApi; }
  
  setPieces(pieces: Map<Key, Piece | undefined>) {
    if (!this.cgApi) return;
    this.cgApi.setPieces(pieces);
    this.onBoardChange();
  }
  private cgApi!: Api;
  private chess = new Chess();
  private initialized = false;
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);
  private el = inject(ElementRef);

  // Promotion state
  pendingPromotion = signal<{ from: Key; to: Key; color: 'w' | 'b' } | null>(null);
  readonly promotionPieces = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.manualSize.set(parseInt(saved, 10));
      }
    }
  }

  ngAfterViewInit() {
    this.initBoard();
    this.setupResizeObserver();
  }

  private setupResizeObserver() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Look for the closest stable boundary container
    let parent = this.el.nativeElement.parentElement;
    while (parent && !parent.classList.contains('board-container-parent')) {
      parent = parent.parentElement;
    }
    
    // Fallback to immediate parent if no boundary class found
    if (!parent) parent = this.el.nativeElement.parentElement;
    if (!parent) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.containerSize = { 
          width: Math.max(0, width - 8), 
          height: Math.max(0, height - 8) 
        };
        this.updateBoardSize();
      }
    });

    this.resizeObserver.observe(parent);
  }

  private updateBoardSize() {
    const GUTTER = this.hideCoordinates ? 0 : 32;
    // Determine the maximum square size that fits in the container (100% fit)
    const maxPossible = Math.min(this.containerSize.width, this.containerSize.height);
    
    // Use manual size if set, otherwise fit to parent
    const targetSize = this.manualSize() || maxPossible;

    // Clamp to global min/max and current container limits
    const totalSize = Math.max(this.minSize + GUTTER, Math.min(this.maxSize, targetSize, maxPossible));

    // Direct DOM update for performance
    this.el.nativeElement.style.setProperty('--board-size', `${totalSize}px`);
    this.el.nativeElement.style.setProperty('--board-gutter', `${GUTTER}px`);

    const boardSize = totalSize - GUTTER;
    if (this.boardSize !== boardSize) {
      this.boardSize = boardSize;
      this.sizeChange.emit(this.boardSize);
      
      // Notify Chessground to redraw
      if (this.cgApi) {
        requestAnimationFrame(() => {
          this.cgApi.redrawAll();
        });
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onMouseMove(event: MouseEvent | TouchEvent) {
    if (!this.isResizing()) return;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const rect = this.el.nativeElement.getBoundingClientRect();
    
    // The manual size is based on total component width from its left edge
    const newSize = Math.round(clientX - rect.left);
    
    if (newSize !== this.manualSize()) {
      this.manualSize.set(newSize);
      this.updateBoardSize();
      
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.STORAGE_KEY, newSize.toString());
      }
    }
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onMouseUp() {
    this.isResizing.set(false);
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    // Only handle scroll navigation if we're not resizing and it's vertical scroll
    if (this.isResizing() || Math.abs(event.deltaY) < 10) return;

    const now = Date.now();
    if (now - this.lastScrollTime < this.SCROLL_THROTTLE) return;
    this.lastScrollTime = now;

    if (event.deltaY > 0) {
      this.nextMove.emit();
    } else {
      this.prevMove.emit();
    }

    // Prevent page scroll when navigating moves
    event.preventDefault();
  }

  startResizing(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing.set(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fen']) {
      const currentFen = this.chess.fen();
      if (this.fen && this.fen !== currentFen) {
        this.safeLoadFen(this.fen);
      }
    }

    if (this.initialized) {
      if (changes['fen'] && !changes['fen'].isFirstChange()) {
        this.syncBoard();
      }
      if (changes['orientation'] && !changes['orientation'].isFirstChange()) {
        this.cgApi.set({ orientation: this.orientation });
      }
      if (changes['syncedShapes'] && !changes['syncedShapes'].isFirstChange()) {
        this.cgApi.set({ drawable: { shapes: this.syncedShapes } });
      }
      if (changes['interactive']) {
        this.syncBoard();
      }
      if (changes['configOverride']) {
        this.applyConfigOverride(this.configOverride || {});
      }
      if (changes['lastMove']) {
        this.syncBoard();
      }
    }
  }

  ngOnDestroy() {
    this.cgApi?.destroy();
    this.resizeObserver?.disconnect();
  }

  undoMove() {
    this.chess.undo();
    this.syncBoard();
    this.fenChange.emit(this.chess.fen());
  }

  private initBoard() {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      if (!this.boardEl) return;
      this.safeLoadFen(this.fen);
      const config: Config = {
        fen: this.fen,
        orientation: this.orientation,
        coordinates: !this.hideCoordinates,
        movable: {
          free: this.isEditor,
          color: this.interactive ? 'both' : undefined,
          dests: (this.interactive && !this.isEditor) ? this.getLegalMoves() : new Map(),
          showDests: !this.isEditor,
          events: {
            after: (orig: Key, dest: Key, meta: MoveMetadata) => this.onMove(orig, dest, meta),
          },
        },
        draggable: { 
          enabled: this.interactive,
          deleteOnDropOff: this.isEditor
        },
        selectable: { enabled: this.interactive },
        drawable: { enabled: true, onChange: () => this.onShapesChanged() },
        events: {
          change: () => this.onBoardChange()
        }
      };
      this.cgApi = Chessground(this.boardEl.nativeElement, config);
      this.initialized = true;
      
      this.syncBoard();
      this.updateBoardSize();
      
      // Secondary sync to ensure pieces are rendered
      requestAnimationFrame(() => {
        this.cgApi?.redrawAll();
      });
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
    const fenToUse = this.isEditor ? this.fen : this.chess.fen();
    
    // Determine last move to highlight
    let lastMoveToSet = this.lastMove;
    if (lastMoveToSet === undefined) {
      const history = this.chess.history({ verbose: true });
      const last = history[history.length - 1];
      if (last) {
        lastMoveToSet = [last.from as Key, last.to as Key];
      }
    }

    this.cgApi.set({
      fen: fenToUse,
      lastMove: lastMoveToSet as any,
      turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
      movable: {
        free: this.isEditor,
        color: this.interactive ? 'both' : undefined,
      dests: (this.interactive && !this.isEditor) ? this.getLegalMoves() : new Map(),
        showDests: !this.isEditor,
      },
      selectable: { enabled: this.interactive },
      draggable: { 
        enabled: this.interactive,
        deleteOnDropOff: this.isEditor
      },
    });

    if (this.configOverride) {
      this.applyConfigOverride(this.configOverride);
    }
  }

  playPremove(): boolean {
    if (!this.cgApi) return false;
    this.safeLoadFen(this.fen);
    return this.cgApi.playPremove();
  }

  cancelPremove(): void {
    if (!this.cgApi) return;
    this.cgApi.cancelPremove();
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

  private getLegalMoves(): Map<Key, Key[]> {
    const dests = new Map<Key, Key[]>();
    try {
      this.chess.moves({ verbose: true }).forEach((m) => {
        const from = m.from as Key;
        const to = m.to as Key;
        const list = dests.get(from) || [];
        list.push(to);
        dests.set(from, list);
      });
    } catch (e) {
      // Ignore errors if FEN is partial or invalid for legal moves
    }
    return dests;
  }

  private safeLoadFen(fen: string) {
    if (!fen) return;
    let fullFen = fen;
    const parts = fen.split(' ');
    if (parts.length < 6) {
      // Append default fields if missing: turn(w) castling(-) ep(-) half(0) full(1)
      const defaults = ['w', '-', '-', '0', '1'];
      fullFen = parts.concat(defaults.slice(parts.length - 1)).join(' ');
    }
    try {
      this.chess.load(fullFen);
    } catch (e) {
      console.warn('Could not load FEN into chess.js:', fullFen);
    }
  }

  public onBoardChange() {
    if (this.isEditor && this.cgApi) {
      const newFen = this.cgApi.getFen();
      this.fenChange.emit(newFen);
    }
  }

  private onMove(orig: Key, dest: Key, meta?: MoveMetadata) {
    if (meta?.premove && this.chess.turn() !== this.orientation[0]) return;
    if (this.isPromotionMove(orig, dest)) {
      this.pendingPromotion.set({ from: orig, to: dest, color: this.chess.turn() });
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
        this.syncBoard();
        this.fenChange.emit(this.chess.fen());
        this.moveMade.emit({ move, fen: this.chess.fen() });
      }
    } catch {
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

  private onShapesChanged() {
    if (this.cgApi) {
      this.shapeDrawn.emit(this.cgApi.state.drawable.shapes);
    }
  }

  getGlyphStyle(square: string) {
    if (!square || square.length < 2) return {};
    const file = square.charCodeAt(0) - 97; // a=0
    const rank = parseInt(square[1]) - 1; // 1=0

    let left, top;
    if (this.orientation === 'white') {
      left = (file + 1) * 12.5;
      top = (7 - rank) * 12.5;
    } else {
      left = (7 - file + 1) * 12.5;
      top = rank * 12.5;
    }

    return {
      left: `${left}%`,
      top: `${top}%`
    };
  }

  resetBoard() {
    this.chess.reset();
    this.syncBoard();
    this.fenChange.emit(this.chess.fen());
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateBoardSize();
  }
}
