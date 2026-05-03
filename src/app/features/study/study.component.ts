import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
  PLATFORM_ID,
  NgZone,
  input,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudyService } from '../../core/services/study.service';
import { AudioService } from '../../core/services/audio.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { AuthService } from '../../core/services/auth.service';
import { ChessBoardComponent, EvalBarComponent } from '@shared/chess';
import { MoveNotationComponent } from '@shared/chess';
import { FormsModule } from '@angular/forms';
import { Subscription, BehaviorSubject, fromEvent } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';
import { MoveNode } from '../../core/models/study.model';
import { buildTreeFromMoves, updateNodeInTree, getPlyFromFen } from '../../core/utils/chess-tree.utils';
import { EngineService } from '../../core/services/engine.service';
import { ConfirmDeleteModalComponent } from '@shared/feedback';
import { AnnotateMoveDialogComponent } from './dialogs/annotate-move-dialog/annotate-move-dialog.component';
import { StudySidebarComponent } from './study-sidebar/study-sidebar.component';
import { StudyInfoComponent } from './study-info/study-info.component';
import { StudyAnalysisComponent } from './study-analysis/study-analysis.component';
import { ButtonComponent } from '@shared/ui';
import { ExplorerBoxComponent } from '../explorer/explorer-box.component';
import { StudyMetadataComponent } from './study-metadata/study-metadata.component';
import { StudyMetadataTabComponent } from './study-metadata-tab/study-metadata-tab.component';
import { EditMetadataDialogComponent } from './dialogs/edit-metadata-dialog/edit-metadata-dialog.component';
import { DevLogger } from '../../core/utils/dev-logger';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [
    CommonModule,
    ChessBoardComponent,
    EvalBarComponent,
    MoveNotationComponent,
    FormsModule,
    DialogModule,
    ConfirmDeleteModalComponent,
    StudySidebarComponent,
    StudyInfoComponent,
    StudyAnalysisComponent,
    ExplorerBoxComponent,
    ButtonComponent,
    StudyMetadataComponent,
    StudyMetadataTabComponent,
  ],
  templateUrl: './study.component.html',
  styles: [`
    :host ::ng-deep {
      .mat-mdc-slide-toggle {
        --mdc-switch-selected-track-color: #22d3ee;
        --mdc-switch-selected-handle-color: #ffffff;
        --mdc-switch-unselected-track-color: #1e293b;
        --mdc-switch-unselected-handle-color: #94a3b8;
        display: flex;
        align-items: center;
        margin: 0 !important;
      }
      .mat-mdc-slide-toggle .mdc-switch {
        width: 30px !important;
        height: 16px !important;
      }
      .mat-mdc-slide-toggle .mdc-switch__track {
        height: 16px !important;
        border-radius: 8px !important;
      }
      .mat-mdc-slide-toggle .mdc-switch__handle-container {
        width: 12px !important;
        height: 12px !important;
        top: 2px !important;
        left: 2px !important;
      }
      .mat-mdc-slide-toggle.mat-checked .mdc-switch__handle-container {
        transform: translateX(14px) !important;
      }
      .mat-mdc-slide-toggle .mdc-switch__handle {
        width: 12px !important;
        height: 12px !important;
      }
      .mdc-switch__icons { display: none !important; }
    }
  `],
  host: { class: 'absolute inset-0 overflow-hidden' },
})
export class StudyComponent implements OnInit, OnDestroy {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private engineService = inject(EngineService);
  private audioService = inject(AudioService);
  private router = inject(Router);
  private dialog = inject(Dialog);

  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  isLoading = this.studyService.isLoading;
  viewerCount = this.studyService.viewerCount;
  
  id = input.required<string>();

  // Engine state
  isEngineActive = signal(false);
  engineEval = signal<string | null>(null);
  engineBestMove = signal<string | null>(null);
  enginePvLines = signal<{ eval: string; pv: string[]; pvIndex: number }[]>([]);
  engineArrows = signal<any[]>([]);
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

  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  moveTree = signal<MoveNode[]>([]);
  currentNode = signal<MoveNode | null>(null);
  currentPly = signal(0);
  boardSize = signal(600);
  boardOrientation = signal<'white' | 'black'>('white');
  remoteShapes = signal<any[]>([]);

  mergedShapes = computed(() => [...this.remoteShapes(), ...this.engineArrows()]);

  initialPly = computed(() => {
    const chapter = this.currentChapter();
    return getPlyFromFen(chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });
  
  lastMoveSquares = computed(() => {
    const node = this.currentNode();
    if (!node || !node.uci || node.uci.length < 4) return undefined;
    return [node.uci.slice(0, 2), node.uci.slice(2, 4)] as any[];
  });

  isOwner = computed(() => {
    const user = this.authService.currentUser();
    const s = this.study();
    if (!user || !s) return false;
    return String(s.user_id || (s as any).userId || s.owner?.id) === String(user.id || user.uid);
  });

  canEdit = computed(() => {
    if (this.isOwner()) return true;
    const user = this.authService.currentUser();
    const s = this.study();
    if (!user || !s) return false;
    return s.collaborators?.find(c => String(c.uid) === String(user.id || user.uid))?.can_edit ?? false;
  });

  isSyncing = signal(true);
  isLargeScreen = signal(false);
  activeTab = signal<'notation' | 'info' | 'metadata'>('notation');
  showDeleteModal = signal(false);
  isDeleting = signal(false);
  isActionInProgress = signal(false);

  private subs = new Subscription();
  private lastChapterId: number | null = null;
  private analysisTrigger$ = new BehaviorSubject<{ fen: string; active: boolean } | null>(null);
  private pvChess = new Chess();
  private lastLocalInteractionTime = 0;

  isEngineVisible = computed(() => {
    const s = this.study();
    if (!s) return false;
    if (s.engine_visibility === 'everyone') return true;
    return this.isOwner();
  });

  constructor() {
    this.analysisTrigger$
      .pipe(takeUntilDestroyed(), debounceTime(150), filter((v): v is { fen: string; active: boolean } => !!v && v.active))
      .subscribe(({ fen }) => this.engineService.startAnalysis(fen));

    effect(() => {
      const chapter = this.currentChapter();
      if (chapter && this.lastChapterId !== chapter.id) {
        this.lastChapterId = chapter.id;
        this.currentNode.set(null);
        this.currentFen.set(chapter.current_fen);
        this.boardOrientation.set(chapter.orientation || 'white');
        this.moveTree.set(buildTreeFromMoves(chapter.moves || [], chapter.initial_fen));
        if (!this.isSyncing() || this.canEdit()) this.goToLastMainlineNode();
      }
    });

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
      }
    });

    effect(() => {
      if (this.isSyncing() && this.studyService.lastRemoteState().chapterId && !this.isActionInProgress()) this.syncToRemoteState();
    });

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const active = this.isEngineActive() && this.isEngineVisible();
      const fen = this.currentFen();
      if (active && this.activeTab() === 'notation') {
        const cached = this.engineService.getCachedAnalysis(fen);
        if (cached) {
          this.engineEval.set(cached.eval);
          this.engineBestMove.set(cached.bestMove);
          this.enginePvLines.set([{ eval: cached.eval, pv: this.formatPvToSan(cached.pv, fen), pvIndex: 0 }]);
          this.engineDepth.set(cached.depth || 0);
          this.engineArrows.set([{ orig: cached.bestMove.substring(0, 2), dest: cached.bestMove.substring(2, 4), brush: 'green' }]);
        }
        this.analysisTrigger$.next({ fen, active: true });
      } else {
        this.analysisTrigger$.next(null);
        this.engineService.stop();
        this.engineEval.set(null);
        this.enginePvLines.set([]);
        this.engineArrows.set([]);
      }
    });

    effect(() => {
      const studyId = this.id();
      if (studyId && isPlatformBrowser(this.platformId)) this.studyService.getStudy(Number(studyId));
    });

    effect(() => {
      const s = this.study();
      const user = this.authService.currentUser();
      if (s && user) {
        const collaborator = s.collaborators?.find(c => String(c.uid) === String(user.id || user.uid));
        if (collaborator) {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => this.isSyncing.set(collaborator.is_syncing), 0);
          });
        }
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.isLargeScreen.set(window.innerWidth >= 1024);
      fromEvent(window, 'resize').pipe(takeUntilDestroyed()).subscribe(() => {
        this.isLargeScreen.set(window.innerWidth >= 1024);
      });
    }
  }

  toggleSync() {
    this.isSyncing.update(v => !v);
    if (this.isSyncing()) this.syncToRemoteState();
  }

  onEngineRetry() {
    this.engineBestMove.set(null);
    this.engineEval.set(null);
    this.enginePvLines.set([]);
    this.engineService.restart();
  }

  toggleEngine() { this.isEngineActive.update(v => !v); }
  toggleEngineSettings() { this.showEngineSettings.update(v => !v); }

  flipBoard() {
    this.boardOrientation.update(o => o === 'white' ? 'black' : 'white');
    if (this.isSyncing() && this.canEdit()) this.studyService.emitNavigation(this.currentFen(), this.moveTree(), this.boardOrientation(), true);
  }

  onMultiPvChange(count: number) {
    this.engineService.setMultiPv(count);
    if (this.isEngineActive()) this.analysisTrigger$.next({ fen: this.currentFen(), active: true });
  }

  private syncToRemoteState() {
    const remote = this.studyService.lastRemoteState();
    if (!remote.chapterId) return;

    // Guard against remote updates overwriting very recent local interactions 
    // unless it's a chapter change or we've been idle for at least 1000ms
    const isChapterChange = String(this.currentChapter()?.id) !== String(remote.chapterId);
    if (!isChapterChange && Date.now() - this.lastLocalInteractionTime < 1000) {
      DevLogger.log('[Study] Skipping remote sync due to recent local interaction');
      return;
    }

    // Only sync if the FEN is actually different to avoid redundant board resets
    if (!isChapterChange && this.currentFen() === remote.fen) {
      return;
    }

    this.remoteShapes.set([]);
    this.engineArrows.set([]);
    if (this.currentChapter()?.id !== remote.chapterId) {
      const target = this.study()?.chapters?.find(c => String(c.id) === String(remote.chapterId));
      if (target) this.studyService.currentChapter.set(target);
    }
    if (remote.moves) this.moveTree.set(buildTreeFromMoves(remote.moves));
    if (remote.fen) {
      this.currentFen.set(remote.fen);
      this.boardOrientation.set(remote.orientation || 'white');
      const node = this.findNodeRecursive(this.moveTree(), remote.fen);
      this.currentNode.set(node);
      this.currentPly.set(node?.ply || this.initialPly());
    }
  }

  private findNodeRecursive(nodes: MoveNode[], fen: string): MoveNode | null {
    for (const node of nodes) {
      if (node.fen === fen) return node;
      if (node.variations) {
        for (const variation of node.variations) {
          const found = this.findNodeRecursive(variation, fen);
          if (found) return found;
        }
      }
    }
    return null;
  }

  private updateCurrentPosition(node: MoveNode | null) {
    if (node && node.fen && node.fen.trim()) {
      this.currentNode.set(node);
      this.currentFen.set(node.fen);
      this.currentPly.set(node.ply);
    } else {
      const chapter = this.currentChapter();
      this.currentNode.set(null);
      this.currentFen.set(chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      this.currentPly.set(this.initialPly());
    }
  }

  private goToLastMainlineNode() {
    const tree = this.moveTree();
    this.updateCurrentPosition(tree.length > 0 ? tree[tree.length - 1] : null);
  }

  onMoveMade(event: any) {
    if (!this.canEdit()) return;
    this.lastLocalInteractionTime = Date.now();
    const move = event.move || event;
    const san = String(move.san || '');
    const fen = String(event.fen || '');
    const current = this.currentNode();
    const newNode: MoveNode = { san, uci: String(move.from || '') + String(move.to || ''), fen, ply: (current?.ply || this.initialPly()) + 1, variations: [], comments: [] };
    this.moveTree.update(tree => {
      if (!current) return [...tree, newNode];
      const newTree = this.insertNodeDeep(tree, current.ply, current.fen, newNode);
      return newTree.length > 0 ? newTree : [...tree, newNode];
    });
    this.updateCurrentPosition(newNode);
    this.remoteShapes.set([]);
    this.engineArrows.set([]);
    this.audioService.playChessMove(move);
    this.studyService.emitMove(san, fen, this.moveTree(), this.boardOrientation(), this.isSyncing()).subscribe();
  }

  private insertNodeDeep(nodes: MoveNode[], parentPly: number, parentFen: string, newNode: MoveNode): MoveNode[] {
    const result: MoveNode[] = nodes.map(node => ({ ...node, variations: node.variations ? node.variations.map(v => [...v]) : [] }));
    for (let i = 0; i < result.length; i++) {
      const node = result[i];
      if (node.ply === parentPly && node.fen === parentFen) {
        if (i === result.length - 1) result.push(newNode);
        else {
          const nextNode = result[i + 1];
          if (nextNode.san !== newNode.san) {
            if (!nextNode.variations) nextNode.variations = [];
            if (!nextNode.variations.find(v => v.length > 0 && v[0].san === newNode.san)) nextNode.variations.push([newNode]);
          }
        }
        return result;
      }
      if (node.variations) {
        for (let j = 0; j < node.variations.length; j++) {
          const updated = this.insertNodeDeep(node.variations[j], parentPly, parentFen, newNode);
          if (updated.length > 0) { node.variations[j] = updated; return result; }
        }
      }
    }
    return [];
  }

  onNodeClicked(node: MoveNode) {
    if (this.isSyncing() && !this.canEdit()) return;
    this.lastLocalInteractionTime = Date.now();
    this.updateCurrentPosition(node);
    this.remoteShapes.set([]);
    this.engineArrows.set([]);
    this.audioService.playMoveSound(node.san);
    if (this.canEdit()) this.studyService.emitNavigation(node.fen, this.moveTree(), this.boardOrientation(), this.isSyncing());
  }

  onDeleteFromHere(target: MoveNode) {
    if (!this.canEdit()) return;

    this.isActionInProgress.set(true);

    // 1. Update tree locally first (synchronous)
    this.moveTree.update(tree => this.deleteFromHereRecursive(tree, target));
    
    // 2. Adjust current position if it was deleted
    const tree = this.moveTree();
    if (this.currentNode() && !this.findNodeRecursive(tree, this.currentNode()!.fen)) {
      this.goToLastMainlineNode();
    }

    // 3. Sync with server
    this.studyService.emitMove('', this.currentFen(), this.moveTree(), this.boardOrientation(), this.isSyncing())
      .subscribe({
        next: () => this.isActionInProgress.set(false),
        error: () => this.isActionInProgress.set(false),
        complete: () => this.isActionInProgress.set(false)
      });
  }

  private deleteFromHereRecursive(nodes: MoveNode[], target: MoveNode): MoveNode[] {
    const index = nodes.findIndex(n => n.fen === target.fen && n.ply === target.ply);
    if (index !== -1) return nodes.slice(0, index);
    return nodes.map(node => {
      if (!node.variations?.length) return node;
      const updatedVariations = node.variations.map(v => this.deleteFromHereRecursive(v, target)).filter(v => v.length > 0);
      return (updatedVariations.length !== node.variations.length || updatedVariations.some((v, i) => v !== node.variations![i])) ? { ...node, variations: updatedVariations } : node;
    });
  }

  onNavigateToPly(ply: number) {
    if (this.isSyncing() && !this.canEdit()) return;
    this.lastLocalInteractionTime = Date.now();
    if (ply <= this.initialPly()) {
      this.updateCurrentPosition(null);
      if (this.canEdit()) this.studyService.emitNavigation(this.currentChapter()?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', this.moveTree(), this.boardOrientation(), this.isSyncing());
      return;
    }
    const node = this.moveTree().find(n => n.ply === ply);
    if (node) {
      this.updateCurrentPosition(node);
      this.remoteShapes.set([]);
      this.engineArrows.set([]);
      this.audioService.playMoveSound(node.san);
      if (this.canEdit()) this.studyService.emitNavigation(node.fen, this.moveTree(), this.boardOrientation(), this.isSyncing());
    }
  }

  onAnnotateMove(node: MoveNode) {
    if (!this.canEdit()) return;
    
    const dialogRef = this.dialog.open(AnnotateMoveDialogComponent, {
      data: node,
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        this.moveTree.update(tree => 
          updateNodeInTree(tree, node.fen, node.ply, {
            comments: result.comment ? [result.comment] : [],
            glyphs: result.glyphs,
          })
        );
        
        // Broadcast and save
        this.studyService.emitMove(
          '', // No SAN change
          this.currentFen(),
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing()
        ).subscribe();
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.subs.add(this.engineService.analysis$.subscribe(analysis => {
        this.ngZone.run(() => {
          if (analysis.fen !== this.currentFen()) return;
          if (analysis.pvIndex === 0) {
            this.engineEval.set(analysis.eval);
            this.engineBestMove.set(analysis.bestMove);
            this.engineDepth.set(analysis.depth);
            this.engineNps.set(analysis.nps);
            if (analysis.bestMove && analysis.bestMove !== '(none)') this.engineArrows.set([{ orig: analysis.bestMove.substring(0, 2), dest: analysis.bestMove.substring(2, 4), brush: 'green' }]);
          }
          this.enginePvLines.set(this.engineService.pvLines().map(line => ({ eval: line.eval, pv: this.formatPvToSan(line.pv, analysis.fen), pvIndex: line.pvIndex })));
        });
      }));
      this.subs.add(this.studyService.onShapesDrawn$.subscribe(payload => {
        this.ngZone.run(() => {
          const myUid = this.authService.currentUser()?.uid || this.authService.currentUser()?.id;
          if (String(payload.userId) !== String(myUid)) this.remoteShapes.set(payload.shapes || []);
        });
      }));
    }
  }

  private formatPvToSan(uciMoves: string[], fen: string): string[] {
    try { this.pvChess.load(fen); } catch (e) { return []; }
    const sanMoves: string[] = [];
    for (const uci of uciMoves) {
      try {
        const move = this.pvChess.move({ from: uci.substring(0, 2), to: uci.substring(2, 4), promotion: uci.length > 4 ? uci.substring(4, 5) : undefined });
        if (move) sanMoves.push(move.san); else break;
      } catch (e) { break; }
    }
    return sanMoves;
  }

  ngOnDestroy() { this.studyService.disconnect(); this.subs.unsubscribe(); }

  onDeleteConfirmed() {
    if (!this.study()) return;
    this.isDeleting.set(true);
    this.studyService.deleteStudy(this.study()!.id).subscribe({
      next: () => {
        this.router.navigate(['/study']);
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
      },
      error: () => this.isDeleting.set(false)
    });
  }

  onShapeDrawn(shapes: any[]) { if (this.canEdit()) this.studyService.emitShapes(shapes); }

  onSaveMetadata(tags: Record<string, string>) {
    const s = this.study();
    const c = this.currentChapter();
    if (!s || !c || !this.canEdit()) return;

    this.studyService.updateChapter(s.id, c.id, {
      name: c.name,
      orientation: c.orientation,
      pgn_tags: tags
    }).subscribe({
      next: () => {
        // Update local chapter object to reflect changes
        this.currentChapter.update(prev => prev ? { ...prev, pgn_tags: tags } : null);
        this.studyService.getStudy(s.id); // Refresh full study to sync other clients
      }
    });
  }

  onEditMetadata() {
    const c = this.currentChapter();
    if (!c || !this.canEdit()) return;

    const dialogRef = this.dialog.open(EditMetadataDialogComponent, {
      data: c.pgn_tags || {},
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        this.onSaveMetadata(result);
      }
    });
  }
}
