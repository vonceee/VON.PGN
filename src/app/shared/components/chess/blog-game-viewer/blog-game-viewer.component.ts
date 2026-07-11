import {
  Component,
  input,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent, MoveNotationComponent } from '@shared/chess';
import { ButtonComponent } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroChevronLeft,
  heroChevronRight,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroArrowsRightLeft,
} from '@ng-icons/heroicons/outline';
import { Chess } from 'chess.js';
import { buildTreeFromMoves } from '../../../../core/utils/chess-tree.utils';
import { MoveNode } from '../../../../core/models/study.model';

@Component({
  selector: 'app-blog-game-viewer',
  standalone: true,
  imports: [
    CommonModule,
    ChessBoardComponent,
    MoveNotationComponent,
    ButtonComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      heroChevronLeft,
      heroChevronRight,
      heroChevronDoubleLeft,
      heroChevronDoubleRight,
      heroArrowsRightLeft,
    }),
  ],
  template: `
    <div class="ui-panel bg-main rounded-xl border border-border-base shadow-sm overflow-hidden flex flex-col md:grid md:grid-cols-[1.2fr_1fr] h-[550px] max-w-4xl mx-auto my-6">
      
      <!-- Left Column: Chess Board & Bottom Controls -->
      <div class="flex flex-col justify-between p-6 border-b md:border-b-0 md:border-r border-border-base bg-subtle/10">
        <!-- Game Title / Header -->
        <div class="mb-4">
          <h3 class="text-lg font-semibold truncate">{{ gameTitle() }}</h3>
          <p class="text-xs text-muted truncate">{{ gameDetails() }}</p>
        </div>

        <!-- Chessboard container -->
        <div class="flex-1 flex items-center justify-center min-h-[300px]">
          <app-chess-board
            [fen]="currentFen()"
            [orientation]="boardOrientation()"
            [interactive]="false"
            [resizable]="false"
            [fluid]="true"
            [hideCoordinates]="false"
          ></app-chess-board>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-center gap-2 mt-4">
          <button
            appButton
            variant="ghost"
            (click)="goToFirst()"
            [disabled]="currentPly() === 0"
            class="p-2 min-w-10 rounded-full"
            title="First Move"
          >
            <ng-icon name="heroChevronDoubleLeft" class="text-md"></ng-icon>
          </button>
          
          <button
            appButton
            variant="ghost"
            (click)="prevMove()"
            [disabled]="currentPly() === 0"
            class="p-2 min-w-10 rounded-full"
            title="Previous Move"
          >
            <ng-icon name="heroChevronLeft" class="text-md"></ng-icon>
          </button>
          
          <button
            appButton
            variant="ghost"
            (click)="flipBoard()"
            class="p-2 min-w-10 rounded-full"
            title="Flip Board"
          >
            <ng-icon name="heroArrowsRightLeft" class="text-md"></ng-icon>
          </button>

          <button
            appButton
            variant="ghost"
            (click)="nextMove()"
            [disabled]="currentPly() === maxPly()"
            class="p-2 min-w-10 rounded-full"
            title="Next Move"
          >
            <ng-icon name="heroChevronRight" class="text-md"></ng-icon>
          </button>

          <button
            appButton
            variant="ghost"
            (click)="goToLast()"
            [disabled]="currentPly() === maxPly()"
            class="p-2 min-w-10 rounded-full"
            title="Last Move"
          >
            <ng-icon name="heroChevronDoubleRight" class="text-md"></ng-icon>
          </button>
        </div>
      </div>

      <!-- Right Column: Move Notation / List -->
      <div class="flex flex-col h-full overflow-hidden bg-main">
        <div class="flex-none p-4 border-b border-border-base bg-subtle/25">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted">Moves list</span>
        </div>
        <div class="flex-1 overflow-y-auto">
          <app-move-notation
            [moveTree]="moveTree()"
            [currentFen]="currentFen()"
            [currentPly]="currentPly()"
            [initialPly]="0"
            [layout]="'grid'"
            (navigate)="onNavigateToPly($event)"
          ></app-move-notation>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogGameViewerComponent {
  pgn = input.required<string>();
  title = input<string>('');

  // Chess navigation states
  timeline = signal<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
  currentPly = signal<number>(0);
  boardOrientation = signal<'white' | 'black'>('white');
  moveTree = signal<MoveNode[]>([]);

  // Metadata headers parsed from PGN
  headers = signal<Record<string, string | null>>({});


  // Computed states
  currentFen = computed(() => this.timeline()[this.currentPly()]);
  maxPly = computed(() => this.timeline().length - 1);

  gameTitle = computed(() => {
    if (this.title()) return this.title();
    const h = this.headers();
    if (h['White'] && h['Black']) {
      return `${h['White']} vs ${h['Black']}`;
    }
    return 'Chess Game';
  });

  gameDetails = computed(() => {
    const h = this.headers();
    const event = h['Event'] && h['Event'] !== '?' ? h['Event'] : '';
    const date = h['Date'] && h['Date'] !== '????.??.??' ? h['Date'] : '';
    const result = h['Result'] && h['Result'] !== '*' ? `(${h['Result']})` : '';
    return [event, date, result].filter(Boolean).join(' • ') || 'Interactive PGN Viewer';
  });

  constructor() {
    effect(() => {
      const pgnString = this.pgn();
      if (pgnString) {
        this.parsePgn(pgnString);
      }
    });
  }

  private parsePgn(pgn: string) {
    try {
      const chess = new Chess();
      // Load PGN into chess.js
      chess.loadPgn(pgn);
      
      const parsedHeaders = chess.header();
      this.headers.set(parsedHeaders);

      // Determine initial FEN (if setup / chess960 or custom start position)
      let initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      if (parsedHeaders['FEN']) {
        initialFen = parsedHeaders['FEN'];
      }

      // Reconstruct game timeline
      const history = chess.history({ verbose: true });
      const reconstructor = new Chess(initialFen);
      const newTimeline = [initialFen];

      for (const move of history) {
        reconstructor.move(move.san);
        newTimeline.push(reconstructor.fen());
      }

      this.timeline.set(newTimeline);
      this.currentPly.set(0);

      // Build MoveNode tree for MoveNotationComponent
      const tree = buildTreeFromMoves({ pgn }, initialFen);
      this.moveTree.set(tree);
    } catch (e) {
      console.error('[BlogGameViewer] Failed to parse PGN:', e);
      // Fallback
      this.timeline.set(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
      this.currentPly.set(0);
      this.moveTree.set([]);
      this.headers.set({});
    }
  }

  goToFirst() {
    this.currentPly.set(0);
  }

  goToLast() {
    this.currentPly.set(this.maxPly());
  }

  prevMove() {
    if (this.currentPly() > 0) {
      this.currentPly.update(p => p - 1);
    }
  }

  nextMove() {
    if (this.currentPly() < this.maxPly()) {
      this.currentPly.update(p => p + 1);
    }
  }

  flipBoard() {
    this.boardOrientation.update(o => o === 'white' ? 'black' : 'white');
  }

  onNavigateToPly(ply: number) {
    if (ply >= 0 && ply <= this.maxPly()) {
      this.currentPly.set(ply);
    }
  }
}
