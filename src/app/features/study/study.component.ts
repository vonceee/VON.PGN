import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudyService } from '../../core/services/study.service';
import { AuthService } from '../../core/services/auth.service';
import { ChessBoardComponent } from '../../shared/components/chess-board/chess-board.component';
import { MoveNotationComponent } from '../../shared/components/move-notation/move-notation.component';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, MoveNotationComponent, FormsModule],
  template: `
    <div class="study-root-container">
      <div class="w-full max-w-[1700px] h-full flex items-center justify-center">
        @if (study(); as s) {
          <div class="study-layout">
            <!-- Left Column: Move Notation (User Requested Left) -->
            <div class="sidebar-wrapper left-sidebar">
              <div class="flex flex-col premium-card rounded-xl overflow-hidden  h-full">
                <div
                  class="p-3 border-b border-border-theme bg-slate-800/20 flex items-center justify-between"
                >
                  <span class="font-bold text-[10px] uppercase tracking-widest text-slate-400"
                    >Analysis & Moves</span
                  >
                  <span
                    class="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-border-theme"
                  >
                    {{ moves().length }} PLY
                  </span>
                </div>
                <app-move-notation
                  class="flex-1"
                  [moves]="moves()"
                  [currentPly]="currentPly()"
                  [showNavigation]="true"
                  (navigate)="onNavigateToMove($event)"
                ></app-move-notation>
              </div>
            </div>

            <!-- Center Column: Board -->
            <div class="board-container-area">
              <div class="board-header mb-4 w-full flex items-center justify-between px-2">
                <div class="flex flex-col">
                  <h1
                    class="font-black text-2xl tracking-tighter capitalize hover:text-cyan-400 transition-colors cursor-default"
                  >
                    {{ s.name }}
                  </h1>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] uppercase font-black tracking-widest text-slate-500"
                      >Study by</span
                    >
                    <span class="text-[11px] font-bold text-slate-300">{{ s.owner.name }}</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <span
                    class="px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest border"
                    [class.border-cyan-500/30]="isOwner()"
                    [class.text-cyan-400]="isOwner()"
                    [class.bg-cyan-500/5]="isOwner()"
                    [class.border-slate-700]="!isOwner()"
                    [class.text-slate-500]="!isOwner()"
                  >
                    {{ isOwner() ? 'Owner' : 'Viewer' }}
                  </span>
                  <span
                    class="px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest border border-slate-700 text-slate-500 bg-slate-800/20"
                  >
                    {{ s.visibility }}
                  </span>
                </div>
              </div>

              <div class="board-wrapper-outer" [class.premium-card-pulse]="isOwner()">
                <div class="board-aspect-hider">
                  <app-chess-board
                    [fen]="currentFen()"
                    [interactive]="isOwner()"
                    [size]="boardSize()"
                    [storageKey]="'boardSize'"
                    (moveMade)="onMoveMade($event)"
                    (shapeDrawn)="onShapeDrawn($event)"
                    (sizeChange)="onBoardSizeChange($event)"
                    [syncedShapes]="remoteShapes()"
                  ></app-chess-board>
                </div>
              </div>
            </div>

            <!-- Right Column: Chapters (Moved to Right) -->
            <div class="sidebar-wrapper right-sidebar">
              <div class="flex flex-col premium-card rounded-xl overflow-hidden  h-full">
                <div
                  class="p-4 border-b border-border-theme bg-slate-800/20 flex items-center justify-between"
                >
                  <h2 class="font-bold text-xs uppercase tracking-widest text-slate-400">
                    Chapters
                  </h2>
                  @if (isOwner()) {
                    <button
                      (click)="createChapter()"
                      class="p-1.5 hover:bg-cyan-400/20 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
                      title="Add Chapter"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                    </button>
                  }
                </div>
                <div class="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar p-2">
                  @for (chap of s.chapters; track chap.id) {
                    <button
                      (click)="selectChapter(chap)"
                      [class.active-chapter]="currentChapter()?.id === chap.id"
                      class="chapter-item group"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <span
                          class="text-[10px] font-bold opacity-30 group-hover:opacity-60 transition-opacity"
                        >
                          {{ $index + 1 }}
                        </span>
                        <span class="truncate">{{ chap.name }}</span>
                      </div>
                      @if (currentChapter()?.id === chap.id) {
                        <div
                          class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                        ></div>
                      }
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else if (isLoading()) {
          <div class="flex items-center justify-center min-h-[400px]">
            <div class="text-center">
              <div
                class="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              ></div>
              <p class="text-slate-500 text-sm font-bold tracking-widest uppercase">
                Initializing Study
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .study-root-container {
        min-height: calc(100vh - 64px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        background: radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 0%, transparent 70%);
      }

      @media (min-width: 768px) {
        .study-root-container {
          height: calc(100vh - 64px);
          overflow: hidden;
          padding: 1.5rem;
        }

        .study-layout {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 2rem;
          width: 100%;
          align-items: start;
        }

        .sidebar-wrapper {
          min-width: 0;
          height: var(--board-size, 500px);
        }

        .left-sidebar {
          justify-self: end;
          width: 100%;
          max-width: 320px;
        }

        .right-sidebar {
          justify-self: start;
          width: 100%;
          max-width: 320px;
        }

        .chapter-item {
          width: 100%;
          text-align: left;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid transparent;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.875rem;
          font-weight: 500;
          color: #94a3b8;
        }

        .chapter-item:hover {
          background-color: rgba(34, 211, 238, 0.05);
          border-color: rgba(34, 211, 238, 0.2);
        }

        .active-chapter {
          background-color: rgba(34, 211, 238, 0.1);
          border-color: rgba(34, 211, 238, 0.3);
          color: white;
          box-shadow: 0 4px 20px -8px rgba(34, 211, 238, 0.3);
        }

        .board-container-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
          overflow: hidden;
        }

        .board-wrapper-outer {
          position: relative;
          background: var(--bg-card);
          padding: 0.25rem;
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          max-width: 100%;
          overflow: hidden;
        }
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(34, 211, 238, 0.2);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(34, 211, 238, 0.4);
      }

      @media (max-width: 767px) {
        .study-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 1.5rem;
        }
      }
    `,
  ],
})
export class StudyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  isLoading = this.studyService.isLoading;

  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  moves = signal<string[]>([]);
  remoteShapes = signal<any[]>([]);
  boardSize = signal(this.loadBoardSize());
  currentPly = signal(0);
  private chessHistory: string[] = [];

  isOwner = computed(() => {
    const user = this.authService.currentUser();
    const s = this.study();
    return user && s && s.user_id === user.uid ? true : false;
  });

  private subs = new Subscription();

  constructor() {
    effect(() => {
      const chapter = this.currentChapter();
      if (chapter) {
        this.currentFen.set(chapter.current_fen);
        this.moves.set(chapter.moves || []);
        this.rebuildChessHistory();
        this.currentPly.set(this.moves().length);
      }

      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
      }
    });
  }

  private rebuildChessHistory() {
    const chapter = this.currentChapter();
    if (!chapter) return;

    this.chessHistory = [
      chapter.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ];
    const tempChess = new Chess(this.chessHistory[0]);

    for (const move of this.moves()) {
      try {
        const result = tempChess.move(move);
        if (result) {
          this.chessHistory.push(tempChess.fen());
        }
      } catch (e) {
        console.error('Error rebuilding study history:', e);
      }
    }
  }

  onNavigateToMove(ply: number) {
    if (ply < 0 || ply >= this.chessHistory.length) return;
    this.currentPly.set(ply);
    const fen = this.chessHistory[ply];
    if (fen) {
      this.currentFen.set(fen);
    }
  }

  onMoveMade(event: any) {
    if (!this.isOwner()) return;

    // In a study, if we are not at the end, we should probably handle variations.
    // However, for this simplified implementation, we'll just append to the moves
    // and rebuild history.
    this.currentFen.set(event.fen);
    const newMoves = [...this.moves(), event.san];
    this.moves.set(newMoves);
    this.rebuildChessHistory();
    this.currentPly.set(newMoves.length);

    this.studyService.emitMove(event.san, event.fen);
  }

  private loadBoardSize(): number {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('boardSize');
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= 280 && size <= 1200) return size;
      }
    }
    return 500;
  }

  onBoardSizeChange(event: number) {
    this.boardSize.set(event);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--board-size', `${event}px`);
    }
  }

  ngOnInit() {
    this.subs.add(
      this.route.params.subscribe((params) => {
        const id = params['id'];
        if (id) {
          setTimeout(() => this.studyService.getStudy(id));
        }
      }),
    );

    this.subs.add(
      this.studyService.onMoveMade$.subscribe((payload) => {
        this.currentFen.set(payload.fen);
        this.moves.set([...this.moves(), payload.move]);
      }),
    );

    this.subs.add(
      this.studyService.onShapesDrawn$.subscribe((payload) => {
        this.remoteShapes.set(payload.shapes);
      }),
    );

    this.subs.add(
      this.studyService.onChapterChanged$.subscribe((payload) => {
        // Handle chapter switch
      }),
    );
  }

  ngOnDestroy() {
    this.studyService.disconnect();
    this.subs.unsubscribe();
  }

  selectChapter(chap: any) {
    this.studyService.currentChapter.set(chap);
  }

  createChapter() {
    const name = prompt('Chapter name:', `Chapter ${this.study()?.chapters_count! + 1}`);
    if (name) {
      this.studyService.addChapter(this.study()?.id!, name).subscribe(() => {
        this.studyService.getStudy(this.study()?.id!);
      });
    }
  }

  onShapeDrawn(shapes: any[]) {
    if (!this.isOwner()) return;
    this.studyService.emitShapes(shapes);
  }
}
