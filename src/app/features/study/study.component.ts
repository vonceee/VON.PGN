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
import { ChessBoardComponent } from '@shared/chess';
import { MoveNotationComponent } from '@shared/chess';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Chess } from 'chess.js';
import { MoveNode } from '../../core/models/study.model';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, MoveNotationComponent, FormsModule],
  template: `
    <div class="study-root-container">
      <div class="w-full max-w-[1700px] h-full flex items-center justify-center">
        @if (study(); as s) {
          <div class="study-layout">
            <!-- Left Column: Move Notation -->
            <div class="sidebar-wrapper left-sidebar">
              <div class="flex flex-col premium-card rounded-xl overflow-hidden h-full">
                <div class="p-3 border-b border-border-theme bg-slate-800/20 flex items-center justify-between">
                  <span class="font-bold text-[10px] uppercase tracking-widest text-slate-400">Analysis & Variations</span>
                  <span class="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-border-theme">
                    PLY {{ currentPly() }}
                  </span>
                </div>
                <app-move-notation
                  class="flex-1"
                  [moveTree]="moveTree()"
                  [currentFen]="currentFen()"
                  [currentPly]="currentPly()"
                  [showNavigation]="true"
                  (nodeClicked)="onNodeClicked($event)"
                  (navigate)="onNavigateToPly($event)"
                ></app-move-notation>
              </div>
            </div>

            <!-- Center Column: Board -->
            <div class="board-container-area">
              <div class="board-header mb-4 w-full flex items-center justify-between px-2">
                <div class="flex flex-col">
                  <h1 class="font-black text-2xl tracking-tighter capitalize transition-colors cursor-default">
                    {{ s.name }}
                  </h1>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] uppercase font-black tracking-widest text-slate-500">Study by</span>
                    <span class="text-[11px] font-bold text-slate-300">{{ s.owner.name }}</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <span class="px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest border border-cyan-500/30 text-cyan-400 bg-cyan-500/5"
                    *ngIf="isOwner()">
                    Owner
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

            <!-- Right Column: Chapters -->
            <div class="sidebar-wrapper right-sidebar">
              <div class="flex flex-col premium-card rounded-xl overflow-hidden h-full">
                <div class="p-4 border-b border-border-theme bg-slate-800/20 flex items-center justify-between">
                  <h2 class="font-bold text-xs uppercase tracking-widest text-slate-400">Chapters</h2>
                  <button *ngIf="isOwner()" (click)="createChapter()" class="p-1.5 hover:bg-cyan-400/20 text-slate-400 hover:text-cyan-400 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                  </button>
                </div>
                <div class="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar p-2">
                  @for (chap of s.chapters; track chap.id) {
                    <button (click)="selectChapter(chap)" [class.active-chapter]="currentChapter()?.id === chap.id" class="chapter-item group">
                      <span>{{ chap.name }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else if (isLoading()) {
          <div class="flex items-center justify-center min-h-[400px]">
             <div class="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .study-root-container { height: calc(100vh - 64px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 0%, transparent 70%); }
      .study-layout { display: grid; grid-template-columns: 320px auto 320px; gap: 2rem; width: 100%; align-items: start; }
      .sidebar-wrapper { height: var(--board-size, 500px); }
      .board-container-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 0;
      }

      .board-wrapper-outer {
        position: relative;
        background: var(--bg-card);
        padding: 0.25rem;
        border-radius: 1rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
        width: var(--board-size, 500px);
      }

      .board-aspect-hider {
        width: 100%;
        aspect-ratio: 1 / 1;
      }
      .chapter-item { width: 100%; text-align: left; padding: 0.75rem 1rem; border-radius: 0.75rem; color: #94a3b8; transition: all 0.2s; }
      .active-chapter { background: rgba(34, 211, 238, 0.1); color: white; border: 1px solid rgba(34, 211, 238, 0.3); }
      .custom-scrollbar::-webkit-scrollbar { width: 3px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
    `,
  ],
})
export class StudyComponent implements OnInit, OnDestroy {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  isLoading = this.studyService.isLoading;

  // Signals for state
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  moveTree = signal<MoveNode[]>([]);
  currentNode = signal<MoveNode | null>(null); // Current position in the tree
  currentPly = signal(0);
  
  boardSize = signal(this.loadBoardSize());
  remoteShapes = signal<any[]>([]);

  isOwner = computed(() => {
    const user = this.authService.currentUser();
    const s = this.study();
    if (!user || !s) return false;
    
    // Check multiple possible ID locations in the study object
    const studyOwnerId = s.user_id || (s as any).userId || s.owner?.id;
    const currentUserId = user.id || user.uid;

    const isOwner = String(studyOwnerId) === String(currentUserId);
    
    // Debug log to confirm check
    console.log('[Study] Ownership check:', {
      studyOwnerId,
      currentUserId,
      isOwner
    });

    return isOwner;
  });

  private subs = new Subscription();

  private lastChapterId: number | null = null;

  constructor() {
    // 1. Initial load when chapter changes
    effect(() => {
      const chapter = this.currentChapter();
      if (chapter) {
        // Only rebuild tree and jump to end if we switched to a DIFFERENT chapter
        const shouldJump = this.lastChapterId !== chapter.id;
        this.lastChapterId = chapter.id;

        if (shouldJump) {
          this.currentFen.set(chapter.current_fen);
          const tree = this.rebuildTreeFromBackend(chapter.moves || [], chapter.initial_fen);
          this.moveTree.set(tree);
          this.goToLastMainlineNode();
        }
      }
    });

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
      }
    });
  }

  private rebuildTreeFromBackend(moves: any, initialFen?: string): MoveNode[] {
    console.log('[Study] Rebuilding tree from data:', moves); // CRITICAL DEBUG LOG
    
    if (!moves) return [];
    
    let processedMoves = moves;
    
    // If it's a string (happens with some database drivers), parse it
    if (typeof moves === 'string' && moves !== '') {
      try {
        processedMoves = JSON.parse(moves);
      } catch (e) {
        console.error('[Study] Failed to parse moves JSON:', moves);
        return [];
      }
    }

    if (!Array.isArray(processedMoves) || processedMoves.length === 0) {
      return [];
    }

    // Check if the data is already a recursive tree (Node objects)
    if (typeof processedMoves[0] === 'object') {
      return processedMoves as MoveNode[];
    }

    // Legacy Fallback: Convert flat string lists to the tree structure
    const rootNodes: MoveNode[] = [];
    const chess = new Chess(initialFen);
    processedMoves.forEach((san, index) => {
      const m = chess.move(san);
      if (m) {
        rootNodes.push({
          san: m.san,
          uci: m.from + m.to,
          fen: chess.fen(),
          ply: index + 1,
          variations: [],
        });
      }
    });
    return rootNodes;
  }

  private goToLastMainlineNode() {
    const tree = this.moveTree();
    if (tree.length === 0) {
      this.currentFen.set(this.currentChapter()?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      this.currentPly.set(0);
      this.currentNode.set(null);
      return;
    }
    
    let node = tree[tree.length - 1];
    this.currentNode.set(node);
    this.currentFen.set(node.fen);
    this.currentPly.set(node.ply);
  }

  onMoveMade(event: any) {
    if (!this.isOwner()) return;

    const current = this.currentNode();
    
    const newNode: MoveNode = {
      san: event.san,
      uci: event.from + event.to,
      fen: event.fen,
      ply: (current?.ply || 0) + 1,
      variations: [],
    };

    this.moveTree.update(tree => {
      if (!current) {
        return [...tree, newNode];
      }
      return this.insertNode(tree, current, newNode);
    });

    this.currentNode.set(newNode);
    this.currentFen.set(event.fen);
    this.currentPly.set(newNode.ply);

    this.studyService.emitMove(event.san, event.fen, this.moveTree());
  }

  private insertNode(nodes: MoveNode[], parent: MoveNode, newNode: MoveNode): MoveNode[] {
    // Look for the parent in this specific array using FEN + Ply to avoid repetition confusion
    const index = nodes.findIndex(n => n.fen === parent.fen && n.ply === parent.ply);
    
    if (index !== -1) {
      if (index === nodes.length - 1) {
        // We are at the end of this specific line, append it
        nodes.push(newNode);
      } else {
        // We are in the middle of this line!
        const nextInLine = nodes[index + 1];
        if (nextInLine.san === newNode.san) {
           // If they played the existing move, do nothing (navigation handles it)
        } else {
           // NEW VARIATION!
           if (!nextInLine.variations) nextInLine.variations = [];
           const existingVar = nextInLine.variations.find(v => v[0].san === newNode.san);
           if (!existingVar) {
             nextInLine.variations.push([newNode]);
           }
        }
      }
      return [...nodes];
    }

    // Not in this level? Scan variations
    for (const node of nodes) {
      if (node.variations) {
        for (let i = 0; i < node.variations.length; i++) {
          node.variations[i] = this.insertNode(node.variations[i], parent, newNode);
        }
      }
    }
    return [...nodes];
  }

  onNodeClicked(node: MoveNode) {
    this.currentNode.set(node);
    this.currentFen.set(node.fen);
    this.currentPly.set(node.ply);
  }

  onNavigateToPly(ply: number) {
    // For now, we find the node in the mainline at this ply
    const node = this.moveTree().find(n => n.ply === ply);
    if (node) this.onNodeClicked(node);
    else if (ply === 0) this.goToLastMainlineNode(); // Or reset to start
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

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.subs.add(this.route.params.subscribe(p => p['id'] && this.studyService.getStudy(p['id'])));

      // Listen for remote chapter switches
      this.subs.add(this.studyService.onChapterChanged$.subscribe(payload => {
        const { chapterId, fen, moves } = payload;
        const s = this.study();
        
        if (s && s.chapters) {
          // 1. Update the chapter data in the master study list first
          this.studyService.currentStudy.update(study => {
            if (!study) return null;
            const updatedChapters = (study.chapters || []).map(c => {
               if (String(c.id) === String(chapterId)) {
                  return { ...c, current_fen: fen, moves: moves };
               }
               return c;
            });
            return { ...study, chapters: updatedChapters };
          });

          // 2. Then switch to it
          const target = s.chapters.find(c => String(c.id) === String(chapterId));
          if (target) {
            this.studyService.currentChapter.set(target);
          }
        }
      }));
    }
  }

  ngOnDestroy() { this.studyService.disconnect(); this.subs.unsubscribe(); }

  selectChapter(chap: any) {
    if (this.currentChapter()?.id === chap.id) return;
    
    this.studyService.currentChapter.set(chap);

    // Sync to socket so others follow (if you're owner)
    if (this.isOwner()) {
      this.studyService.emitChapterChange(this.study()!.id, chap.id, chap.current_fen, chap.moves || []);
    }
  }

  createChapter() {
    if (!this.isOwner()) return;

    const name = prompt('Chapter Name:', `Chapter ${(this.study()?.chapters?.length ?? 0) + 1}`);
    if (!name) return;

    const s = this.study();
    if (!s) return;

    this.studyService.addChapter(s.id, name).subscribe({
      next: (newChapter) => {
        // Refresh the study to get the updated chapters list
        this.studyService.getStudy(s.id);
        // Switch to the new chapter
        this.studyService.currentChapter.set(newChapter);
      }
    });
  }
  onShapeDrawn(shapes: any[]) { if (this.isOwner()) this.studyService.emitShapes(shapes); }
  onBoardSizeChange(size: number) {
    this.boardSize.set(size);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--board-size', `${size}px`);
    }
  }
}
