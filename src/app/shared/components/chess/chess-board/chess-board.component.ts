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
  NgZone,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Chess, Move } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Key, MoveMetadata, Piece } from 'chessground/types';
import { AudioService } from '../../../../core/services/audio.service';
import { BoardThemeService } from '../../../../core/services/board-theme.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [FormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="board-resize-wrapper" [class.fluid]="fluid">
      <div class="board-container-wrapper relative" [class.no-coords]="hideCoordinates">
        <div class="board-tiles-container relative w-full h-full">
          <div #boardEl class="board-container">
            <div class="absolute inset-0 flex items-center justify-center text-gray-500 opacity-20 pointer-events-none">
              {{ isEditor ? 'Editor Board' : 'Loading...' }}
            </div>
          </div>

          <!-- Promotion Overlay -->
          @if (pendingPromotion(); as p) {
            <div class="absolute inset-0 z-40 bg-black/20" (click)="cancelPromotion()"></div>

            <div
              class="absolute inset-0 z-50 flex items-center justify-center    zoom-in "
            >
              <div
                class="promotion-menu p-4 bg-surface border border-slate-200 rounded-2xl  flex gap-4"
                (click)="$event.stopPropagation()"
              >
                @for (piece of promotionPieces; track piece.type) {
                  <button
                    (click)="selectPromotion(piece.type)"
                    class="w-20 h-20 flex items-center justify-center rounded-xl bg-slate-200 hover:bg-surface border border-slate-200  active:scale-90"
                  >
                    <img
                      [src]="getPromotionPieceUrl(piece.type, p.color)"
                      [alt]="piece.label"
                      class="w-16 h-16 object-contain"
                    />
                  </button>
                }
              </div>
            </div>
          }

          <!-- Resize Handle -->
          @if (resizable) {
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
          }

          <!-- Glyphs Layer -->
          <div class="absolute inset-0 pointer-events-none z-20">
            @for (g of glyphs(); track g.square + g.symbol) {
              <div 
                class="w-[30px] h-[30px] aspect-square rounded-full border-2 border-white  text-white -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center box-border    absolute"
                [class.bg-[var(--color-annotation-good)]]="g.class === 'good' || g.class === 'brilliant'"
                [class.bg-[var(--color-annotation-bad)]]="g.class === 'mistake' || g.class === 'blunder'"
                [class.bg-[var(--color-annotation-interesting)]]="g.class === 'interesting' || g.class === 'dubious' || g.class === 'only-move' || g.class === 'zugzwang'"
                [style]="getGlyphStyle(g.square)"
              >
                <span class="text-[14px]  [text-shadow:_0_1px_2px_rgba(0,0,0,0.2)]">
                  {{ g.symbol }}
                </span>
              </div>
            }
          </div>
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
      .board-resize-wrapper.fluid {
        width: 100%;
        height: auto;
      }
       .board-container-wrapper {
        width: 100%;
        aspect-ratio: 1 / 1;
        box-sizing: border-box;
        padding-left: 20px;
        padding-bottom: 20px;
      }
      .board-container-wrapper.no-coords {
        padding-left: 0;
        padding-bottom: 0;
      }
      .board-tiles-container {
        width: 100%;
        height: 100%;
        position: relative;
      }
      .board-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: visible;
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
    '[class.w-full]': 'fluid || !manualSize()',
    '[class.w-fit]': '!fluid && manualSize()',
    'class': 'block h-full'
  },
})
export class ChessBoardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('boardEl') boardEl!: ElementRef<HTMLDivElement>;

  @Input() fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() interactive: boolean = true;
  /**
   * Server-supplied legal destinations (Lila pattern).
   * Record<from, to[]> e.g. { e2: ['e3','e4'], d1: ['c2','b3'] }
   * When provided, Chessground uses this map instead of computing moves locally.
   * Set to null to lock the board (opponent's turn or spectating).
   */
  @Input() possibleMoves: Record<string, string[]> | null = null;
  @Input() minSize: number = 240;
  @Input() maxSize: number = 1000;
  @Input() syncedShapes: any[] = [];
  @Input() configOverride: Config | null = null;
  @Input() preMoveEnabled: boolean = true;
  @Input() isEditor: boolean = false;
  @Input() hideCoordinates: boolean = false;
  @Input() resizable: boolean = true;
  @Input() fluid: boolean = false;
  @Input() lastMove: Key[] | undefined = undefined;
  @Input() layoutColumnsWidth?: number;
  glyphs = input<{ square: string; symbol: string; class: string }[]>([]);

  @Output() fenChange = new EventEmitter<string>();
  @Output() moveMade = new EventEmitter<{ move: Move; fen: string; uci: string }>();
  @Output() sizeChange = new EventEmitter<number>();
  @Output() shapeDrawn = new EventEmitter<any[]>();
  @Output() preMoveCancelled = new EventEmitter<void>();
  @Output() prevMove = new EventEmitter<void>();
  @Output() nextMove = new EventEmitter<void>();

  // Sizing State
  boardSize: number = 400;
  private containerSize: { width: number; height: number } = { width: 800, height: 800 };
  private resizeObserver: ResizeObserver | null = null;
  public manualSize = signal<number | null>(null);
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
  private isProgrammaticSet = false;
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private audioService = inject(AudioService);
  private el = inject(ElementRef);
  private boardThemeService = inject(BoardThemeService);

  // Promotion state
  pendingPromotion = signal<{ from: Key; to: Key; color: 'w' | 'b' } | null>(null);
  readonly promotionPieces = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];



  ngAfterViewInit() {
    this.initBoard();
    this.setupResizeObserver();
  }

  private setupResizeObserver() {
    if (!isPlatformBrowser(this.platformId)) return;

    const parent = this.el.nativeElement.parentElement;
    if (!parent) return;

    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this.containerSize = {
            width: Math.max(0, width),
            height: Math.max(0, height)
          };
          this.updateBoardSize();
        }
      });

      this.resizeObserver.observe(parent);
    });
  }

  private updateBoardSize() {
    const GUTTER = 0;

    if (!isPlatformBrowser(this.platformId)) return;

    const parent = this.el.nativeElement.parentElement;
    const currentParentHeight = parent ? parent.clientHeight : 0;
    const currentParentWidth = parent ? parent.clientWidth : 0;

    // Determine the maximum size that fits the screen height
    const maxHeight = currentParentHeight || this.containerSize.height || (window.innerHeight - 120);

    // Determine the maximum size that fits the screen width (accounting for other columns' fixed widths)
    let otherWidth = this.layoutColumnsWidth;
    if (otherWidth === undefined) {
      const isThreeCol = window.innerWidth >= 1280;
      const isTwoCol = window.innerWidth >= 768 && window.innerWidth < 1280;
      otherWidth = isThreeCol ? (330 + 400 + 80) : (isTwoCol ? (400 + 60) : 32);
    }

    // Limit screen width reference to maximum container width (1850px) to prevent overflowing container boundaries
    const maxContainerWidth = 1850;
    const activeWidth = Math.min(window.innerWidth, maxContainerWidth);
    const maxWidth = activeWidth - otherWidth;

    // The maximum possible board size is the minimum of available width and height
    const maxWidthConstraint = currentParentWidth || maxWidth;
    const maxPossible = Math.max(this.minSize, Math.min(maxWidthConstraint, maxHeight));

    // Use manual size if set, otherwise fit to parent
    const targetSize = this.fluid ? this.containerSize.width : (this.manualSize() || maxPossible);

    // Clamp to global min/max and stable screen limits
    const totalSize = Math.max(this.minSize + GUTTER, Math.min(this.maxSize, targetSize, maxPossible));

    // Direct DOM update for performance
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--board-size', `${totalSize}px`);
    }
    if (!this.fluid) {
      this.el.nativeElement.style.setProperty('--board-size', `${totalSize}px`);
    } else {
      this.el.nativeElement.style.removeProperty('--board-size');
    }

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
    }
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onMouseUp() {
    if (this.isResizing()) {
      this.isResizing.set(false);
      this.updateBoardSize();
    }
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

    if (changes['orientation'] && this.cgApi) {
      this.cgApi.set({ orientation: this.orientation });
    }

    if (this.initialized) {
      if (changes['fen'] && !changes['fen'].isFirstChange()) {
        this.syncBoard();
      }
      if (changes['syncedShapes'] && !changes['syncedShapes'].isFirstChange()) {
        this.isProgrammaticSet = true;
        try {
          this.cgApi.set({ drawable: { shapes: this.syncedShapes } });
          if (this.cgApi.redrawAll) {
            this.cgApi.redrawAll();
          }
        } finally {
          this.isProgrammaticSet = false;
        }
      }
    if (changes['interactive'] || changes['possibleMoves']) {
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
        drawable: {
          enabled: true,
          shapes: this.syncedShapes,
          onChange: () => this.onShapesChanged()
        },
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

    this.isProgrammaticSet = true;
    try {
      this.cgApi.set({
        fen: fenToUse,
        lastMove: lastMoveToSet as any,
        turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
        movable: {
          free: this.isEditor,
          // Use server-supplied dests when possibleMoves is set (Lila pattern);
          // fall back to local chess.js computation for analysis/study boards.
          color: this.interactive
            ? (this.possibleMoves !== null ? this.chess.turn() === 'w' ? 'white' : 'black' : 'both')
            : undefined,
          dests: this.interactive && !this.isEditor
            ? (this.possibleMoves !== null
                ? this.toDestsMap(this.possibleMoves)
                : this.getLegalMoves())
            : new Map(),
          showDests: !this.isEditor,
        },
        selectable: { enabled: this.interactive },
        draggable: {
          enabled: this.interactive,
          deleteOnDropOff: this.isEditor
        },
        drawable: {
          shapes: this.syncedShapes
        }
      });
    } finally {
      this.isProgrammaticSet = false;
    }

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

  /** Converts the server's Record<from, to[]> format to the Map<Key, Key[]> Chessground expects. */
  private toDestsMap(dests: Record<string, string[]>): Map<Key, Key[]> {
    return new Map(Object.entries(dests) as [Key, Key[]][]);
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
        const uci = from + to + (move.promotion ?? '');
        this.fenChange.emit(this.chess.fen());
        this.moveMade.emit({ move, fen: this.chess.fen(), uci });
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

  getPromotionPieceUrl(type: string, color: 'w' | 'b'): string {
    const pieceSet = this.boardThemeService.pieceSet();
    const typeUpper = type.toUpperCase();
    return `/pieces/${pieceSet}/${color}${typeUpper}.svg`;
  }

  cancelPromotion() {
    this.pendingPromotion.set(null);
    this.syncBoard();
  }

  private shapesAreEqual(a: any[] | undefined, b: any[] | undefined): boolean {
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const s1 = a[i];
      const s2 = b[i];
      if (s1.orig !== s2.orig || s1.dest !== s2.dest || s1.brush !== s2.brush) {
        return false;
      }
    }
    return true;
  }

  private onShapesChanged() {
    if (this.isProgrammaticSet) return;
    if (this.cgApi) {
      const shapes = this.cgApi.state.drawable.shapes;
      this.shapeDrawn.emit([...shapes]);
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
