import {
  Component,
  OnInit,
  inject,
  signal,
  OnDestroy,
  HostListener,
  PLATFORM_ID,
  ChangeDetectorRef,
  effect,
  computed,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { AuthService } from '../../../core/services/auth.service';
import { EngineService, type SearchMode } from '../../../core/services/engine.service';
import { ChessBoardComponent, EvalBarComponent } from '@shared/chess';
import { MoveNotationComponent } from '@shared/chess';
import { ButtonComponent } from '@shared/ui';
import { Chess } from 'chess.js';
import { Subscription } from 'rxjs';
import { StudyAnalysisComponent } from '../../study/study-analysis/study-analysis.component';
import { MoveNode } from '../../../core/models/study.model';
import { buildTreeFromMoves } from '../../../core/utils/chess-tree.utils';

@Component({
  selector: 'app-game-review',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    ChessBoardComponent,
    EvalBarComponent,
    MoveNotationComponent,
    StudyAnalysisComponent,
  ],
  template: `
    <div class="absolute inset-0 overflow-hidden flex flex-col bg-main">
      @if (isLoading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-slate-400">Loading game archive...</p>
          </div>
        </div>
      } @else if (game(); as g) {
        <!-- Main Content Grid Wrapper -->
        <div class="flex-1 w-full max-w-[1920px] mx-auto overflow-hidden p-4 lg:p-6 xl:p-8">
          <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr_400px] xl:grid-cols-[350px_1fr_440px] 2xl:grid-cols-[380px_1fr_480px] gap-4 lg:gap-6 h-full overflow-hidden">
            
            <!-- Left Column: Game Info Sidebar -->
            <div class="h-full overflow-hidden flex flex-col gap-4">
              <div class="p-6 border border-border-theme rounded-2xl bg-surface/5 ui-panel flex flex-col gap-6">
                <div class="flex items-center justify-between">
                  <div class="text-xl  flex items-center gap-2 opacity-80 uppercase er">
                    <span class="text-cyan-400">•</span>
                    <span>Review</span>
                  </div>
                  <div class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono opacity-60 uppercase tracking-widest">
                    {{ g.time_control }}
                  </div>
                </div>

                <!-- Players -->
                <div class="flex flex-col gap-4">
                  <!-- Black Player -->
                  <div class="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div class="flex items-center gap-3 overflow-hidden">
                      <div class="w-3 h-3 rounded-full shrink-0 border border-slate-500 bg-slate-950"></div>
                      <span class="truncate font-bold text-sm">{{ g.black_player.name }}</span>
                    </div>
                    <div class="flex items-center gap-2 font-mono text-[11px] shrink-0">
                      <span class="opacity-40">({{ g.black_elo }})</span>
                      @if (g.black_rating_change !== null) {
                        <span class="font-bold" [class]="g.black_rating_change >= 0 ? 'text-green-400' : 'text-red-400'">
                          {{ g.black_rating_change > 0 ? '+' : '' }}{{ g.black_rating_change }}
                        </span>
                      }
                    </div>
                  </div>

                  <!-- White Player -->
                  <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div class="flex items-center gap-3 overflow-hidden">
                      <div class="w-3 h-3 rounded-full shrink-0 border border-slate-500 bg-white"></div>
                      <span class="truncate font-bold text-sm">{{ g.white_player.name }}</span>
                    </div>
                    <div class="flex items-center gap-2 font-mono text-[11px] shrink-0">
                      <span class="opacity-40">({{ g.white_elo }})</span>
                      @if (g.white_rating_change !== null) {
                        <span class="font-bold" [class]="g.white_rating_change >= 0 ? 'text-green-400' : 'text-red-400'">
                          {{ g.white_rating_change > 0 ? '+' : '' }}{{ g.white_rating_change }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Result -->
                <div class="pt-4 border-t border-white/5 text-center">
                  <div class="text-lg  " [class]="getResultClass(g)">
                    {{ g.result }}
                  </div>
                  <div class="text-[10px] uppercase font-bold opacity-30 tracking-widest mt-0.5">
                    {{ g.termination }}
                  </div>
                </div>

                <!-- Quick Actions -->
                <div class="flex flex-col gap-2 pt-2">
                  <a appButton variant="outline" routerLink="/games/history" class="w-full">
                    Back to History
                  </a>
                </div>
              </div>

              <!-- Details Card -->
              <div class="p-5 border border-border-theme rounded-2xl bg-surface/5 ui-panel">
                <h4 class="text-[10px] uppercase  text-slate-500 mb-4 tracking-widest">Game Details</h4>
                <div class="space-y-4">
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-slate-500 uppercase font-bold">Played on</span>
                    <span class="text-xs font-mono text-slate-300">{{ g.created_at | date: 'mediumDate' }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-slate-500 uppercase font-bold">Category</span>
                    <span class="text-xs font-mono text-slate-300">{{ g.time_control }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Center Column: Board -->
            <div class="flex flex-col items-center justify-center overflow-hidden relative">
              @if (isEngineActive()) {
                <div class="lg:hidden w-full max-w-[800px] px-4 pb-2">
                  <app-eval-bar [eval]="engineEval()" [orientation]="boardOrientation()" mode="horizontal"></app-eval-bar>
                </div>
              }

              <div class="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden relative board-container-parent">
                <div class="flex items-center justify-center gap-0 max-h-full">
                  <app-chess-board
                    [fen]="currentFen()"
                    [orientation]="boardOrientation()"
                    [interactive]="true"
                    [lastMove]="lastMoveSquares()"
                    (moveMade)="onMoveMade($event)"
                  ></app-chess-board>

                  <div class="hidden lg:block w-4 h-[var(--board-size)]   ease-in-out"
                       [class.opacity-0]="!isEngineActive()" [class.invisible]="!isEngineActive()">
                    <app-eval-bar [eval]="engineEval()" [orientation]="boardOrientation()" mode="vertical"></app-eval-bar>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Notation & Analysis -->
            <div class="h-full flex flex-col gap-2 overflow-hidden border-l border-border-theme bg-surface/5 ui-panel rounded-2xl">
              <!-- Tabs Header -->
              <div class="flex border-b border-border-theme">
                @for (tab of ['notation', 'analysis']; track tab) {
                  <button
                    (click)="activeTab.set(tab === 'notation' ? 'notation' : 'analysis')"
                    class="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest   relative after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-cyan-500 after:-translate-x-1/2 after: after:"
                    [class.text-cyan-400]="activeTab() === tab"
                    [class.opacity-40]="activeTab() !== tab"
                    [class.after:w-full]="activeTab() === tab"
                  >
                    {{ tab }}
                  </button>
                }
              </div>

              <div class="flex-1 flex flex-col overflow-hidden">
                @if (activeTab() === 'notation') {
                  <app-move-notation
                    class="flex-1 overflow-y-auto custom-scrollbar"
                    [moveTree]="moveTree()"
                    [currentFen]="currentFen()"
                    [currentPly]="currentPly()"
                    [showNavigation]="true"
                    (navigate)="onNavigateToPly($event)"
                    (nodeClicked)="onNodeClicked($event)"
                  ></app-move-notation>
                } @else {
                  <app-study-analysis
                    [isEngineActive]="isEngineActive()"
                    [isEngineError]="isEngineError()"
                    [engineEval]="engineEval()"
                    [engineDepth]="engineDepth()"
                    [formattedNps]="formattedNps()"
                    [showEngineSettings]="showEngineSettings()"
                    [multiPvCount]="multiPvCount()"
                    [searchMode]="searchMode()"
                    [enginePvLines]="enginePvLines()"
                    [currentPly]="currentPly()"
                    (toggleEngine)="toggleEngine()"
                    (retryEngine)="onEngineRetry()"
                    (toggleSettings)="toggleEngineSettings()"
                    (multiPvChange)="onMultiPvChange($event)"
                  ></app-study-analysis>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; height: 100vh; overflow: hidden; }
    `,
  ],
})
export class GameReviewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private engineService = inject(EngineService);
  private ngZone = inject(NgZone);

  game = signal<any | null>(null);
  isLoading = signal(true);
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  currentPly = signal(0);
  boardOrientation = signal<'white' | 'black'>('white');
  activeTab = signal<'notation' | 'analysis'>('notation');

  // Move Tree State
  moveTree = signal<MoveNode[]>([]);
  currentNode = signal<MoveNode | null>(null);

  // Engine state
  isEngineActive = signal(false);
  engineEval = signal<string | null>(null);
  enginePvLines = signal<{ eval: string; pv: string[]; pvIndex: number }[]>([]);
  engineDepth = signal(0);
  engineNps = signal(0);
  isEngineError = this.engineService.isError;
  showEngineSettings = signal(false);
  multiPvCount = this.engineService.multiPv;
  searchMode = this.engineService.searchMode;

  formattedNps = computed(() => {
    const nps = this.engineNps();
    if (nps <= 0) return '';
    if (nps >= 1_000_000) return (nps / 1_000_000).toFixed(1) + ' Mn/s';
    if (nps >= 1_000) return Math.round(nps / 1_000) + ' kn/s';
    return nps + ' n/s';
  });

  lastMoveSquares = computed(() => {
    const current = this.currentNode();
    if (!current || !current.uci) return undefined;
    return [current.uci.substring(0, 2), current.uci.substring(2, 4)] as any;
  });

  private chess = new Chess();
  private pvChess = new Chess();
  private subs = new Subscription();

  constructor() {
    // Sync current FEN and Engine
    effect(() => {
      const active = this.isEngineActive();
      const fen = this.currentFen();
      if (active && isPlatformBrowser(this.platformId)) {
        this.engineService.startAnalysis(fen);
      } else {
        this.engineService.stop();
        this.engineEval.set(null);
        this.enginePvLines.set([]);
      }
    });
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.params['gameId'];
    this.loadGame(gameId);

    if (isPlatformBrowser(this.platformId)) {
      this.subs.add(this.engineService.analysis$.subscribe(analysis => {
        this.ngZone.run(() => {
          if (analysis.fen !== this.currentFen()) return;
          if (analysis.pvIndex === 0) {
            this.engineEval.set(analysis.eval);
            this.engineDepth.set(analysis.depth);
            this.engineNps.set(analysis.nps);
          }
          this.enginePvLines.set(this.engineService.pvLines().map(line => ({
            eval: line.eval,
            pv: this.formatPvToSan(line.pv, analysis.fen),
            pvIndex: line.pvIndex
          })));
        });
      }));
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.engineService.stop();
  }

  loadGame(gameId: string): void {
    this.gameService.getArchivedGame(gameId).subscribe({
      next: (res) => {
        this.game.set(res.game);
        const myUid = this.authService.currentUser()?.uid;
        const isBlack = String(res.game.black_player_id) === String(myUid);
        this.boardOrientation.set(isBlack ? 'black' : 'white');
        
        // Build initial tree from game moves
        if (res.game.moves) {
          const tree = buildTreeFromMoves(res.game.moves);
          this.moveTree.set(tree);
        }
        
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onMoveMade(event: any) {
    const move = event.move || event;
    const san = String(move.san || '');
    const fen = String(event.fen || '');
    const uci = String(move.from || '') + String(move.to || '');
    const current = this.currentNode();
    
    const newNode: MoveNode = { 
      san, 
      uci, 
      fen, 
      ply: (current?.ply || 0) + 1, 
      variations: [], 
      comments: [] 
    };

    this.moveTree.update(tree => {
      const newTree = this.insertNodeDeep([...tree], current?.ply || 0, current?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', newNode);
      return newTree.length > 0 ? newTree : [...tree, newNode];
    });

    this.updateCurrentPosition(newNode);
  }

  private insertNodeDeep(nodes: MoveNode[], parentPly: number, parentFen: string, newNode: MoveNode): MoveNode[] {
    const result: MoveNode[] = nodes.map(node => ({ ...node, variations: node.variations ? node.variations.map(v => [...v]) : [] }));
    
    // If we are at the root and parent is the initial position
    if (parentPly === 0 && parentFen.includes('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq')) {
      // Check if move already exists as mainline
      if (result.length > 0) {
        if (result[0].san === newNode.san) return result;
        // Check if exists as variation
        const existingVar = result[0].variations?.find(v => v.length > 0 && v[0].san === newNode.san);
        if (existingVar) return result;
        
        // Add as variation to the first move
        if (!result[0].variations) result[0].variations = [];
        result[0].variations.push([newNode]);
        return result;
      } else {
        return [newNode];
      }
    }

    for (let i = 0; i < result.length; i++) {
      const node = result[i];
      if (node.ply === parentPly && node.fen === parentFen) {
        if (i === result.length - 1) {
          result.push(newNode);
        } else {
          const nextNode = result[i + 1];
          if (nextNode.san !== newNode.san) {
            if (!nextNode.variations) nextNode.variations = [];
            if (!nextNode.variations.find(v => v.length > 0 && v[0].san === newNode.san)) {
              nextNode.variations.push([newNode]);
            }
          }
        }
        return result;
      }
      if (node.variations) {
        for (let j = 0; j < node.variations.length; j++) {
          const updated = this.insertNodeDeep(node.variations[j], parentPly, parentFen, newNode);
          if (updated.length > 0) { 
            node.variations[j] = updated; 
            return result; 
          }
        }
      }
    }
    return [];
  }

  updateCurrentPosition(node: MoveNode | null) {
    this.currentNode.set(node);
    if (node) {
      this.currentFen.set(node.fen);
      this.currentPly.set(node.ply);
    } else {
      this.currentFen.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      this.currentPly.set(0);
    }
  }

  onNodeClicked(node: MoveNode) {
    this.updateCurrentPosition(node);
  }

  onNavigateToPly(ply: number): void {
    // Legacy support for flat navigation - try to find in mainline
    const mainline = this.moveTree();
    if (ply === 0) {
      this.updateCurrentPosition(null);
      return;
    }
    const target = mainline.find(m => m.ply === ply);
    if (target) {
      this.updateCurrentPosition(target);
    }
  }

  toggleEngine() {
    this.isEngineActive.update(v => !v);
  }

  onEngineRetry() {
    this.engineService.restart();
  }

  toggleEngineSettings() {
    this.showEngineSettings.update(v => !v);
  }

  onMultiPvChange(count: number) {
    this.engineService.setMultiPv(count);
    if (this.isEngineActive()) {
      this.engineService.startAnalysis(this.currentFen());
    }
  }

  private formatPvToSan(uciMoves: string[], fen: string): string[] {
    try {
      this.pvChess.load(fen);
    } catch (e) {
      return [];
    }
    const sanMoves: string[] = [];
    for (const uci of uciMoves) {
      try {
        const move = this.pvChess.move({
          from: uci.substring(0, 2),
          to: uci.substring(2, 4),
          promotion: uci.length > 4 ? uci.substring(4, 5) : undefined
        });
        if (move) sanMoves.push(move.san);
        else break;
      } catch (e) {
        break;
      }
    }
    return sanMoves;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (event.key === 'ArrowRight') this.nextMove();
    if (event.key === 'ArrowLeft') this.prevMove();
    if (event.key === 'Home') this.updateCurrentPosition(null);
    if (event.key === 'End') {
      const tree = this.moveTree();
      if (tree.length > 0) this.updateCurrentPosition(tree[tree.length - 1]);
    }
  }

  nextMove(): void {
    const current = this.currentNode();
    const tree = this.moveTree();
    if (!current) {
      if (tree.length > 0) this.updateCurrentPosition(tree[0]);
      return;
    }
    // Find in mainline or current branch
    const findNext = (nodes: MoveNode[]): MoveNode | null => {
      const idx = nodes.findIndex(n => n.fen === current.fen && n.ply === current.ply);
      if (idx !== -1 && idx < nodes.length - 1) return nodes[idx + 1];
      for (const node of nodes) {
        if (node.variations) {
          for (const v of node.variations) {
            const next = findNext(v);
            if (next) return next;
          }
        }
      }
      return null;
    };
    const next = findNext(tree);
    if (next) this.updateCurrentPosition(next);
  }

  prevMove(): void {
    const current = this.currentNode();
    if (!current) return;
    
    // This is harder with the tree structure without parent pointers
    // For now, let's just go back to the ply before in the mainline or use a simple search
    const findParent = (nodes: MoveNode[], target: MoveNode): MoveNode | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (i > 0 && nodes[i].fen === target.fen && nodes[i].ply === target.ply) return nodes[i-1];
        if (i === 0 && nodes[i].fen === target.fen && nodes[i].ply === target.ply) return null; // Parent is root
        
        if (nodes[i].variations) {
          for (const v of nodes[i].variations) {
            if (v.length > 0 && v[0].fen === target.fen && v[0].ply === target.ply) return nodes[i];
            const p = findParent(v, target);
            if (p) return p;
          }
        }
      }
      return null;
    };

    const parent = findParent(this.moveTree(), current);
    this.updateCurrentPosition(parent);
  }

  getResultClass(game: any): string {
    if (game.result === '1/2-1/2') return 'text-slate-400';
    const myUid = this.authService.currentUser()?.uid;
    const isMeWhite = String(game.white_player_id) === String(myUid);
    const iWon = (game.result === '1-0' && isMeWhite) || (game.result === '0-1' && !isMeWhite);
    return iWon ? 'text-green-500' : 'text-red-500';
  }
}


