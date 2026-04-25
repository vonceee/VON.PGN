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
      }
      .board-container {
        width: 100%;
        height: 100%;
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

  @Output() fenChange = new EventEmitter<string>();
  @Output() moveMade = new EventEmitter<{ move: Move; fen: string }>();
  @Output() sizeChange = new EventEmitter<number>();
  @Output() shapeDrawn = new EventEmitter<any[]>();
  @Output() preMoveCancelled = new EventEmitter<void>();

  // Sizing State
  boardSize: number = 400;
  private containerSize: { width: number; height: number } = { width: 800, height: 800 };
  private resizeObserver: ResizeObserver | null = null;

  public get api(): Api { return this.cgApi; }
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

  ngOnInit() {}

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
    // Determine the maximum square size that fits in the container (100% fit)
    const maxPossible = Math.min(this.containerSize.width, this.containerSize.height);
    
    // Clamp to global min/max
    const clampedSize = Math.max(this.minSize, Math.min(this.maxSize, maxPossible));

    // Direct DOM update for performance
    this.el.nativeElement.style.setProperty('--board-size', `${clampedSize}px`);

    if (this.boardSize !== clampedSize) {
      this.boardSize = clampedSize;
      this.sizeChange.emit(this.boardSize);
      
      // Notify Chessground to redraw
      if (this.cgApi) {
        requestAnimationFrame(() => {
          this.cgApi.redrawAll();
        });
      }
    }
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
        coordinates: true,
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
    this.cgApi.set({
      fen: fenToUse,
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

  private onBoardChange() {
    if (this.isEditor && this.cgApi) {
      const newFen = this.cgApi.getFen();
      if (newFen !== this.fen) {
        this.fenChange.emit(newFen);
      }
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
