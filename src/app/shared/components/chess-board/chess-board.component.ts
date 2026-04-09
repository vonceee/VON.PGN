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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Key } from 'chessground/types';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="board-resize-wrapper" [style.width.px]="boardSize">
      <div #boardEl class="board-container"></div>
      @if (showControls) {
        <div class="board-controls">
          <input
            type="range"
            [min]="minSize"
            [max]="maxSize"
            [(ngModel)]="boardSize"
            (ngModelChange)="onResize($event)"
            class="resize-slider"
            title="Board size"
          />
          <span class="size-label">{{ boardSize }}px</span>
          <button (click)="resetBoard()" class="p-2 border border-border-theme rounded hover:bg-cyan-400" title="Reset to starting position">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .board-resize-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      container-type: inline-size;
    }
    .board-container {
      width: 100%;
      aspect-ratio: 1 / 1;
    }
    .board-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
    .resize-slider {
      flex: 1;
      height: 4px;
      accent-color: rgb(34, 211, 238);
      cursor: pointer;
    }
    .size-label {
      font-size: 1rem;
      color: rgb(148, 163, 184);
      min-width: 40px;
      text-align: right;
      user-select: none;
    }
  `],
})
export class ChessBoardComponent implements AfterViewInit, OnInit, OnChanges, OnDestroy {
  @ViewChild('boardEl') boardEl!: ElementRef<HTMLDivElement>;

  @Input() fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() interactive: boolean = true;
  @Input() size: number = 400;
  @Input() minSize: number = 240;
  @Input() maxSize: number = 640;
  @Input() showControls: boolean = true;

  @Output() fenChange = new EventEmitter<string>();
  @Output() moveMade = new EventEmitter<{ from: string; to: string; san: string; fen: string }>();
  @Output() sizeChange = new EventEmitter<number>();

  boardSize: number = 400;

  ngOnInit() {
    this.boardSize = this.size;
  }

  private cgApi!: Api;
  private chess = new Chess();
  private initialized = false;
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);

  ngAfterViewInit() {
    this.initBoard();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.initialized) {
      if (changes['fen'] && !changes['fen'].isFirstChange()) {
        this.chess.load(this.fen);
        this.syncBoard();
      }
      if (changes['orientation'] && !changes['orientation'].isFirstChange()) {
        this.cgApi.set({ orientation: this.orientation });
      }
      if (changes['size'] && !changes['size'].isFirstChange()) {
        this.boardSize = this.size;
        setTimeout(() => this.cgApi?.redrawAll());
      }
    }
  }

  ngOnDestroy() {
    this.cgApi?.destroy();
  }

  private initBoard() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Small delay to ensure container dimensions are ready
    setTimeout(() => {
      this.chess.load(this.fen);

      this.cgApi = Chessground(this.boardEl.nativeElement, {
        fen: this.fen,
        orientation: this.orientation,
        coordinates: true,
        movable: {
          free: false,
          color: this.interactive ? this.turnColor() : undefined,
          dests: this.interactive ? this.getLegalMoves() : new Map(),
          events: {
            after: (orig, dest) => this.onMove(orig, dest),
          },
        },
        draggable: {
          enabled: this.interactive,
        },
        selectable: {
          enabled: false,
        },
        drawable: {
          enabled: true,
        },
      });

      this.initialized = true;
    }, 50);
  }

  private syncBoard() {
    this.cgApi.set({
      fen: this.chess.fen(),
      turnColor: this.turnColor(),
      movable: {
        color: this.interactive ? this.turnColor() : undefined,
        dests: this.interactive ? this.getLegalMoves() : new Map(),
      },
    });
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

  private onMove(orig: Key, dest: Key) {
    try {
      const move = this.chess.move({ from: orig, to: dest, promotion: 'q' });
      this.audioService.playMoveSound(move.san);
      this.syncBoard();
      this.fenChange.emit(this.chess.fen());
      this.moveMade.emit({
        from: orig,
        to: dest,
        san: move.san,
        fen: this.chess.fen(),
      });
    } catch {
      this.syncBoard();
    }
  }

  resetBoard() {
    this.chess.reset();
    this.syncBoard();
    this.fenChange.emit(this.chess.fen());
  }

  onResize(size: number) {
    this.boardSize = size;
    this.sizeChange.emit(size);
    this.cgApi?.redrawAll();
  }
}
