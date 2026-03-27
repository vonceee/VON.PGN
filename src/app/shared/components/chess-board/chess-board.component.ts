import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Key } from 'chessground/types';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="board-resize-wrapper" [style.width.px]="boardSize">
      <div #boardEl class="board-container"></div>
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
        <button (click)="resetBoard()" class="text-sm px-4 py-2 border border-border-theme rounded hover:bg-cyan-400" title="Reset to starting position">
          Reset
        </button>
      </div>
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
export class ChessBoardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('boardEl') boardEl!: ElementRef<HTMLDivElement>;

  @Input() fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() interactive: boolean = true;
  @Input() minSize: number = 240;
  @Input() maxSize: number = 640;

  @Output() fenChange = new EventEmitter<string>();
  @Output() moveMade = new EventEmitter<{ from: string; to: string; san: string; fen: string }>();
  @Output() sizeChange = new EventEmitter<number>();

  boardSize: number = 400;
  private cgApi!: Api;
  private chess = new Chess();
  private initialized = false;

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
    }
  }

  ngOnDestroy() {
    this.cgApi?.destroy();
  }

  private initBoard() {
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
