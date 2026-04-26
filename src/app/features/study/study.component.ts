import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
  PLATFORM_ID,
  HostListener,
  NgZone,
  input,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudyService } from '../../core/services/study.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { AddChapterDialogComponent, AddChapterDialogResult } from './dialogs/add-chapter-dialog/add-chapter-dialog.component';
import { ConfirmDeleteDialogComponent } from './dialogs/confirm-delete-dialog/confirm-delete-dialog.component';
import { EditChapterDialogComponent, EditChapterDialogResult } from './dialogs/edit-chapter-dialog/edit-chapter-dialog.component';
import { StudySettingsDialogComponent } from './dialogs/study-settings-dialog/study-settings-dialog.component';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService, UserSearchResult } from '../../core/services/user.service';
import { AddCollaboratorDialogComponent } from './dialogs/add-collaborator-dialog/add-collaborator-dialog.component';
import { ChessBoardComponent, EvalBarComponent } from '@shared/chess';
import { MoveNotationComponent } from '@shared/chess';
import { AudioService } from '../../core/services/audio.service';
import { FormsModule } from '@angular/forms';
import { Subscription, BehaviorSubject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';
import { MoveNode, StudyChapter } from '../../core/models/study.model';
import { buildTreeFromMoves } from '../../core/utils/chess-tree.utils';
import { ButtonComponent } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronRight, heroCog6Tooth, heroPlay, heroPause, heroBolt, heroPencil, heroArrowPath, heroUserPlus, heroTrash } from '@ng-icons/heroicons/outline';
import { EngineService, type SearchMode } from '../../core/services/engine.service';
import { ConfirmDeleteModalComponent } from '@shared/feedback';
import { UserHovercardDirective } from '@shared/directives';

import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, EvalBarComponent, MoveNotationComponent, FormsModule, DialogModule, NgIconComponent, ButtonComponent, MatSlideToggleModule, ConfirmDeleteModalComponent, UserHovercardDirective],
  providers: [provideIcons({ heroChevronRight, heroCog6Tooth, heroPlay, heroPause, heroBolt, heroPencil, heroArrowPath, heroUserPlus, heroTrash })],
  templateUrl: './study.component.html',
  styles: [`
    :host ::ng-deep {
      /* Base Slide Toggle Adjustments */
      .mat-mdc-slide-toggle {
        --mdc-switch-selected-track-color: #22d3ee;
        --mdc-switch-selected-handle-color: #ffffff;
        --mdc-switch-selected-focus-track-color: #22d3ee;
        --mdc-switch-selected-hover-track-color: #22d3ee;
        --mdc-switch-selected-pressed-track-color: #22d3ee;
        
        --mdc-switch-unselected-track-color: #1e293b;
        --mdc-switch-unselected-handle-color: #94a3b8;
        
        display: flex;
        align-items: center;
        margin: 0 !important;
      }

      /* Force cyan color for the checked state */
      .mat-mdc-slide-toggle.mat-checked .mdc-switch__track {
        background-color: #22d3ee !important;
        border-color: #22d3ee !important;
      }
      
      .mat-mdc-slide-toggle.mat-checked .mdc-switch__handle {
        background-color: #ffffff !important;
      }

      /* Sizing */
      .mat-mdc-slide-toggle .mdc-switch {
        width: 30px !important;
        height: 16px !important;
        padding: 0 !important;
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

      /* Hide the default checkbox checkmark that sometimes appears in unstyled MDC */
      .mdc-switch__icons {
        display: none !important;
      }
    }
  `],
  host: {
    class: 'absolute inset-0 overflow-hidden',
  },
})
export class StudyComponent implements OnInit, OnDestroy {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private dialog = inject(Dialog);
  private toastService = inject(ToastService);
  private engineService = inject(EngineService);
  private audioService = inject(AudioService);

  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  isLoading = this.studyService.isLoading;
  id = input.required<string>();

  // Engine state
  isEngineActive = signal(false);
  engineEval = signal<string | null>(null);
  engineBestMove = signal<string | null>(null);
  enginePvLines = signal<{ eval: string; pv: string[]; pvIndex: number }[]>([]);
  engineArrows = signal<any[]>([]);
  engineDepth = signal(0);
  engineNps = signal(0);
  isEngineReady = this.engineService.isReady;
  isEngineError = this.engineService.isError;
  showEngineSettings = signal(false);

  // Engine settings (bound to UI)
  multiPvCount = this.engineService.multiPv;
  searchMode = this.engineService.searchMode;
  searchValue = this.engineService.searchValue;


  // Format NPS for display
  formattedNps = computed(() => {
    const nps = this.engineNps();
    if (nps <= 0) return '';
    if (nps >= 1_000_000) return (nps / 1_000_000).toFixed(1) + ' Mn/s';
    if (nps >= 1_000) return Math.round(nps / 1_000) + ' kn/s';
    return nps + ' n/s';
  });

  // Signals for state
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  moveTree = signal<MoveNode[]>([]);
  currentNode = signal<MoveNode | null>(null); // Current position in the tree
  currentPly = signal(0);

  boardSize = signal(600);
  boardOrientation = signal<'white' | 'black'>('white');
  remoteShapes = signal<any[]>([]);

  // Combined shapes for the board
  mergedShapes = computed(() => {
    return [...this.remoteShapes(), ...this.engineArrows()];
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

    const studyOwnerId = s.user_id || (s as any).userId || s.owner?.id;
    const currentUserId = user.id || user.uid;

    return String(studyOwnerId) === String(currentUserId);
  });

  canEdit = computed(() => {
    if (this.isOwner()) return true;

    const user = this.authService.currentUser();
    const s = this.study();
    if (!user || !s) return false;

    const currentUserId = user.id || user.uid;
    const collaborator = s.collaborators?.find(c => String(c.uid) === String(currentUserId));
    return collaborator?.can_edit ?? false;
  });

  isSyncing = signal(false);
  activeTab = signal<'notation' | 'info'>('notation');
  showDeleteModal = signal(false);
  isDeleting = signal(false);

  private subs = new Subscription();
  private lastChapterId: number | null = null;
  private analysisTrigger$ = new BehaviorSubject<{ fen: string; active: boolean } | null>(null);
  private pvChess = new Chess();

  constructor() {
    // 1. Debounced Engine Trigger
    this.analysisTrigger$
      .pipe(
        takeUntilDestroyed(),
        debounceTime(150),
        filter((v): v is { fen: string; active: boolean } => !!v && v.active)
      )
      .subscribe(({ fen }) => {
        this.engineService.startAnalysis(fen);
      });

    effect(() => {
      const chapter = this.currentChapter();
      if (chapter) {
        const shouldJump = this.lastChapterId !== chapter.id;
        this.lastChapterId = chapter.id;

        if (shouldJump) {
          this.currentNode.set(null); // Clear state before jumping to new chapter
          this.currentFen.set(chapter.current_fen);
          this.boardOrientation.set(chapter.orientation || 'white');
          const tree = buildTreeFromMoves(chapter.moves || [], chapter.initial_fen);
          this.moveTree.set(tree);

          // Only jump to end if we're the owner OR if we are NOT sync-locked
          if (!this.isSyncing() || this.canEdit()) {
            this.goToLastMainlineNode();
          }
        }
      }
    });

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
      }
    });

    // Auto-sync effect
    effect(() => {
      const isSyncing = this.isSyncing();
      const remoteState = this.studyService.lastRemoteState();

      if (isSyncing && remoteState.chapterId) {
        this.syncToRemoteState();
      }
    });

    // 2. Engine Analysis Lifecycle & Instant Cache Lookups
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const active = this.isEngineActive();
      const fen = this.currentFen();
      const tab = this.activeTab();

      if (active && tab === 'notation') {
        // Instant check: If we have a cached result, show it immediately!
        const cached = this.engineService.getCachedAnalysis(fen);
        if (cached) {
          this.engineEval.set(cached.eval);
          this.engineBestMove.set(cached.bestMove);
          this.enginePvLines.set([{
            eval: cached.eval,
            pv: this.formatPvToSan(cached.pv, fen),
            pvIndex: 0,
          }]);
          this.engineDepth.set(cached.depth || 0);
          
          // Re-draw arrows immediately from cache
          const arrow = {
            orig: cached.bestMove.substring(0, 2),
            dest: cached.bestMove.substring(2, 4),
            brush: 'green',
          };
          this.engineArrows.set([arrow]);
        }

        // Always queue the actual search (debounced)
        this.analysisTrigger$.next({ fen, active: true });
      } else {
        this.analysisTrigger$.next(null);
        this.engineService.stop();
        // Clear eval and visuals when stopping
        this.engineEval.set(null);
        this.engineBestMove.set(null);
        this.enginePvLines.set([]);
        this.engineArrows.set([]);
        this.engineDepth.set(0);
        this.engineNps.set(0);
      }
    });

    // Fetch study when ID changes
    effect(() => {
      const studyId = this.id();
      if (studyId && isPlatformBrowser(this.platformId)) {
        this.studyService.getStudy(Number(studyId));
      }
    });
  }

  toggleSync() {
    this.isSyncing.update((v) => !v);
    if (this.isSyncing()) {
      this.syncToRemoteState();
    }
  }

  onEngineRetry() {
    this.engineBestMove.set(null);
    this.engineEval.set(null);
    this.enginePvLines.set([]);
    this.engineService.restart();
  }

  toggleEngine() {
    this.isEngineActive.update(v => !v);
  }

  toggleEngineSettings() {
    this.showEngineSettings.update(v => !v);
  }

  flipBoard() {
    this.boardOrientation.update(o => o === 'white' ? 'black' : 'white');
    
    // Broadcast flip to others if syncing and can edit
    if (this.isSyncing() && this.canEdit()) {
      this.studyService.emitNavigation(this.currentFen(), this.moveTree(), this.boardOrientation(), true);
    }
  }

  onMultiPvChange(count: number) {
    this.engineService.setMultiPv(count);
    // Restart analysis with new PV count if engine is active
    if (this.isEngineActive()) {
      this.analysisTrigger$.next({ fen: this.currentFen(), active: true });
    }
  }

  onSearchModeChange(mode: SearchMode) {
    this.engineService.setSearchMode(mode);
    if (this.isEngineActive()) {
      this.analysisTrigger$.next({ fen: this.currentFen(), active: true });
    }
  }

  onSearchValueChange(value: number) {
    this.engineService.setSearchMode(this.searchMode(), value);
    if (this.isEngineActive()) {
      this.analysisTrigger$.next({ fen: this.currentFen(), active: true });
    }
  }

  goDeeper() {
    this.engineService.goDeeper();
  }

  private syncToRemoteState() {
    const remote = this.studyService.lastRemoteState();
    if (!remote.chapterId) return;

    // Clear shapes on any remote state change (move/chapter)
    this.remoteShapes.set([]);
    this.engineArrows.set([]);

    // 1. Switch chapter if needed
    if (this.currentChapter()?.id !== remote.chapterId) {
      const target = this.study()?.chapters?.find((c) => String(c.id) === String(remote.chapterId));
      if (target) {
        this.studyService.currentChapter.set(target);
      }
    }

    // 2. Set tree and FEN
    if (remote.moves) {
      const tree = buildTreeFromMoves(remote.moves);
      this.moveTree.set(tree);
    }
    
    if (remote.fen) {
      this.currentFen.set(remote.fen);
      this.boardOrientation.set(remote.orientation || 'white');
      // Try to find the node in the new tree to highlight it
      const node = this.findNodeRecursive(this.moveTree(), remote.fen);
      if (node) {
        this.currentNode.set(node);
        this.currentPly.set(node.ply);
      } else {
        this.currentNode.set(null);
        this.currentPly.set(0);
      }
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
    if (node) {
      // Use the node's FEN directly if available
      if (node.fen && node.fen.trim()) {
        this.currentNode.set(node);
        this.currentFen.set(node.fen);
        this.currentPly.set(node.ply);
      } else {
        console.warn('[StudyComponent] Node has invalid FEN:', node);
      }
    } else {
      // Reset to start of chapter
      const chapter = this.currentChapter();
      this.currentNode.set(null);
      this.currentFen.set(chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      this.currentPly.set(0);
    }
  }

  private goToLastMainlineNode() {
    const tree = this.moveTree();
    if (tree.length === 0) {
      this.updateCurrentPosition(null);
      return;
    }
    this.updateCurrentPosition(tree[tree.length - 1]);
  }

  onMoveMade(event: any) {
    if (!this.canEdit()) return;

    // Extract move details from the event (chess-board emits { move, fen })
    const move = event.move || event;
    const san = String(move.san || '');
    const from = String(move.from || '');
    const to = String(move.to || '');
    const fen = String(event.fen || '');

    const current = this.currentNode();
    const newNode: MoveNode = {
      san,
      uci: from + to,
      fen,
      ply: (current?.ply || 0) + 1,
      variations: [],
      comments: [],
    };

    this.moveTree.update((tree) => {
      if (!current) {
        return [...tree, newNode];
      }

      const newTree = this.insertNodeDeep(tree, current.ply, current.fen, newNode);
      return newTree.length > 0 ? newTree : [...tree, newNode];
    });

    this.updateCurrentPosition(newNode);
    
    // Clear shapes on move
    this.remoteShapes.set([]);
    this.engineArrows.set([]);
    
    this.audioService.playChessMove(move);
    this.studyService.emitMove(san, fen, this.moveTree(), this.boardOrientation(), this.isSyncing());
  }

  private insertNodeDeep(
    nodes: MoveNode[],
    parentPly: number,
    parentFen: string,
    newNode: MoveNode,
  ): MoveNode[] {
    // Deep copy the nodes to avoid mutation
    const result: MoveNode[] = nodes.map((node) => ({
      ...node,
      variations: node.variations ? node.variations.map((v) => [...v]) : [],
    }));

    for (let i = 0; i < result.length; i++) {
      const node = result[i];

      if (node.ply === parentPly && node.fen === parentFen) {
        // Found the parent - append new node to mainline
        if (i === result.length - 1) {
          // Parent is last node in mainline, append directly
          result.push(newNode);
        } else {
          // Parent has a successor - check if it's a different move
          const nextNode = result[i + 1];
          if (nextNode.san !== newNode.san) {
            // Different move - add as variation
            if (!nextNode.variations) nextNode.variations = [];
            const existingVar = nextNode.variations.find((v) => v.length > 0 && v[0].san === newNode.san);
            if (!existingVar) {
              nextNode.variations.push([newNode]);
            }
          }
        }
        return result;
      }

      // Check variations recursively
      if (node.variations && node.variations.length > 0) {
        let foundInVariation = false;
        for (let j = 0; j < node.variations.length; j++) {
          const updated = this.insertNodeDeep(node.variations[j], parentPly, parentFen, newNode);
          if (updated.length > 0) {
            node.variations[j] = updated;
            foundInVariation = true;
            break;
          }
        }
        if (foundInVariation) {
          return result;
        }
      }
    }

    return [];
  }

  onNodeClicked(node: MoveNode) {
    if (this.isSyncing() && !this.canEdit()) return;
    this.updateCurrentPosition(node);
    
    // Clear shapes when moving to a new position
    this.remoteShapes.set([]);
    this.engineArrows.set([]);
    this.audioService.playMoveSound(node.san);
    
    if (this.canEdit()) {
      this.studyService.emitNavigation(node.fen, this.moveTree(), this.boardOrientation(), this.isSyncing());
    }
  }

  onDeleteFromHere(target: MoveNode) {
    if (!this.canEdit()) return;

    this.moveTree.update((tree) => {
      const newTree = this.deleteFromHereRecursive(tree, target);
      return [...newTree];
    });

    this.afterTreeMutation();
  }

  private afterTreeMutation() {
    const tree = this.moveTree();
    
    // Check if current position is still valid
    const current = this.currentNode();
    if (current) {
      const stillExists = this.findNodeRecursive(tree, current.fen);
      if (!stillExists) {
        // Fallback to last mainline node or start
        this.goToLastMainlineNode();
      }
    }

    // Sync with backend
    const latestChapter = this.currentChapter();
    if (latestChapter) {
      // Small timeout to ensure signal updates are flushed before reading them
      // (though Signal updates are technically synchronous, this is safer for complex trees)
      setTimeout(() => {
        this.studyService.emitMove(
          '', // No specific move made, just tree update
          this.currentFen(),
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing()
        );
      }, 0);
    }
  }

  private deleteFromHereRecursive(nodes: MoveNode[], target: MoveNode): MoveNode[] {
    const index = nodes.findIndex((n) => n.fen === target.fen && n.ply === target.ply);
    if (index !== -1) {
      // Found the target in this list, truncate from here
      return nodes.slice(0, index);
    }

    // Deep copy/map to avoid direct mutation of the signal's objects
    return nodes.map((node) => {
      if (!node.variations || node.variations.length === 0) return node;

      const updatedVariations = node.variations
        .map((v) => this.deleteFromHereRecursive(v, target))
        .filter((v) => v.length > 0);

      // Only return a new object if variations actually changed
      if (updatedVariations.length !== node.variations.length) {
        return { ...node, variations: updatedVariations };
      }

      // Check if any specific variation was truncated
      const variationChanged = updatedVariations.some((v, i) => v !== node.variations[i]);
      if (variationChanged) {
        return { ...node, variations: updatedVariations };
      }

      return node;
    });
  }



  onNavigateToPly(ply: number) {
    if (this.isSyncing() && !this.canEdit()) return;
    if (ply === 0) {
      this.updateCurrentPosition(null);
      if (this.canEdit()) {
        const chapter = this.currentChapter();
        this.studyService.emitNavigation(
          chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing(),
        );
      }
      return;
    }
    // Note: this only navigates mainline. For variations, nodeClicked is used.
    const node = this.moveTree().find((n) => n.ply === ply);
    if (node) {
      this.updateCurrentPosition(node);
      
      // Clear shapes on move
      this.remoteShapes.set([]);
      this.engineArrows.set([]);
      this.audioService.playMoveSound(node.san);

      if (this.canEdit()) {
        this.studyService.emitNavigation(node.fen, this.moveTree(), this.boardOrientation(), this.isSyncing());
      }
    }
  }


  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Subscribe to engine analysis updates
      this.subs.add(
        this.engineService.analysis$.subscribe(analysis => {
          // Re-enter Angular zone for UI updates
          this.ngZone.run(() => {
            // Safety: Only update if the analysis is still for the current position
            if (analysis.fen !== this.currentFen()) return;

            // Update top-level eval (from best line, pvIndex 0)
            if (analysis.pvIndex === 0) {
              this.engineEval.set(analysis.eval);
              this.engineBestMove.set(analysis.bestMove);
              this.engineDepth.set(analysis.depth);
              this.engineNps.set(analysis.nps);
            }

            // Convert aggregated PV lines from the engine service to SAN
            const rawLines = this.engineService.pvLines();
            const sanLines = rawLines.map(line => ({
              eval: line.eval,
              pv: this.formatPvToSan(line.pv, analysis.fen),
              pvIndex: line.pvIndex,
            }));
            this.enginePvLines.set(sanLines);

            // Generate best move arrow (from line 0)
            if (analysis.pvIndex === 0 && analysis.bestMove && analysis.bestMove !== '(none)') {
              const arrow = {
                orig: analysis.bestMove.substring(0, 2),
                dest: analysis.bestMove.substring(2, 4),
                brush: 'green',
              };
              this.engineArrows.set([arrow]);
            }
          });
        })
      );

      // 2. Subscribe to remote shapes (arrows/circles) from other users (usually the owner)
      this.subs.add(
        this.studyService.onShapesDrawn$.subscribe(payload => {
          this.ngZone.run(() => {
            // Only update if we are not the one who drew them
            const myUid = this.authService.currentUser()?.uid || this.authService.currentUser()?.id;
            if (String(payload.userId) !== String(myUid)) {
              this.remoteShapes.set(payload.shapes || []);
            }
          });
        })
      );
    }
  }

  /**
   * Converts a list of UCI moves to SAN strings based on current position
   */
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
          promotion: uci.length > 4 ? uci.substring(4, 5) : undefined,
        });
        if (move) {
          sanMoves.push(move.san);
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    return sanMoves;
  }

  ngOnDestroy() {
    this.studyService.disconnect();
    this.subs.unsubscribe();
  }

  selectChapter(chap: any) {
    if (this.isSyncing() && !this.canEdit()) return;
    if (this.currentChapter()?.id === chap.id) return;
    this.studyService.currentChapter.set(chap);
    if (this.canEdit()) {
      this.studyService.emitChapterChange(this.study()!.id, chap.id, chap.current_fen, chap.moves || [], chap.orientation, this.isSyncing());
    }
  }

  createChapter() {
    if (!this.canEdit()) return;

    const dialogRef = this.dialog.open<AddChapterDialogResult>(AddChapterDialogComponent, {
      data: { defaultName: `Chapter ${(this.study()?.chapters?.length ?? 0) + 1}` }
    });

    dialogRef.closed.subscribe((result) => {
      if (!result) return;
      const s = this.study();
      if (!s) return;

      if (result.type === 'pgn' && result.pgn) {
        this.executePgnImport(s.id, result.pgn);
      } else {
        this.studyService.addChapter(s.id, result.name, result.fen, result.orientation).subscribe({
          next: (res) => {
            const newChapter = res?.data || res;
            this.studyService.getStudy(s.id, newChapter.id);
            this.boardOrientation.set(result.orientation || 'white');
            this.toastService.show('Chapter created successfully!', 'success');
          },
        });
      }
    });
  }

  onEditChapter(event: MouseEvent, chap: StudyChapter) {
    if (!this.canEdit()) return;
    event.stopPropagation(); // Prevent selection

    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<EditChapterDialogResult>(EditChapterDialogComponent, {
      data: {
        currentName: chap.name,
        currentOrientation: chap.orientation || 'white',
        isLastChapter: (s.chapters?.length ?? 0) <= 1
      }
    });

    dialogRef.closed.subscribe((result) => {
      if (!result) return;

      if (result.action === 'save' && result.name) {
        this.studyService.updateChapter(s.id, chap.id, { 
          name: result.name,
          orientation: result.orientation 
        }).subscribe({
          next: () => {
            this.toastService.show('Chapter updated', 'success');
            if (this.currentChapter()?.id === chap.id) {
              this.boardOrientation.set(result.orientation || 'white');
            }
            this.studyService.getStudy(s.id); // Refresh
          },
          error: (err) => {
            console.error('Failed to rename chapter:', err);
            this.toastService.show('Failed to rename chapter', 'error');
          }
        });
      } else if (result.action === 'delete') {
        // Still double confirm for safety
        const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
          data: {
            title: 'Delete Chapter',
            message: `Are you sure you want to delete "${chap.name}"? This action cannot be undone.`,
            confirmText: 'Delete'
          }
        });

        confirmRef.closed.subscribe((confirmed) => {
          if (confirmed) {
            this.studyService.deleteChapter(s.id, chap.id).subscribe({
              next: () => {
                this.toastService.show('Chapter deleted', 'success');
                if (this.currentChapter()?.id === chap.id) {
                  const remaining = s.chapters?.filter(c => c.id !== chap.id) || [];
                  if (remaining.length > 0) {
                    this.selectChapter(remaining[0]);
                  } else {
                    this.router.navigate(['/study']);
                  }
                }
                this.studyService.getStudy(s.id);
              }
            });
          }
        });
      }
    });
  }

  onShapeDrawn(shapes: any[]) {
    if (this.canEdit()) this.studyService.emitShapes(shapes);
  }

  addCollaborator() {
    if (!this.isOwner()) return;

    const dialogRef = this.dialog.open<UserSearchResult>(AddCollaboratorDialogComponent);

    dialogRef.closed.subscribe((result) => {
      if (result) {
        const s = this.study();
        if (!s) return;

        this.studyService.addCollaborator(s.id, result.uid).subscribe({
          next: () => {
            this.toastService.show('Collaborator added', 'success');
            this.studyService.getStudy(s.id); // Refresh
          },
          error: (err) => {
            console.error('Failed to add collaborator:', err);
            this.toastService.show('Failed to add collaborator', 'error');
          }
        });
      }
    });
  }

  removeCollaborator(userId: string) {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const collaborator = s.collaborators?.find(c => String(c.uid) === String(userId));
    const username = collaborator?.username || 'this user';

    const confirmRef = this.dialog.open<boolean>(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Remove Collaborator',
        message: `Are you sure you want to remove "${username}" from this study?`,
        confirmText: 'Remove'
      }
    });

    confirmRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.studyService.removeCollaborator(s.id, userId).subscribe({
          next: () => {
            this.toastService.show('Collaborator removed', 'success');
            this.studyService.getStudy(s.id); // Refresh
          },
          error: (err) => {
            console.error('Failed to remove collaborator:', err);
            this.toastService.show('Failed to remove collaborator', 'error');
          }
        });
      }
    });
  }

  toggleCollaboratorPermission(userId: string, canEdit: boolean) {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    this.studyService.updateCollaboratorPermission(s.id, userId, canEdit).subscribe({
      next: () => {
        this.toastService.show(canEdit ? 'Permission granted' : 'Permission revoked', 'success');
        this.studyService.getStudy(s.id); // Refresh
      },
      error: (err) => {
        console.error('Failed to update permission:', err);
        this.toastService.show('Failed to update permission', 'error');
      }
    });
  }

  importPgn() {
    if (!this.canEdit()) return;
    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open<AddChapterDialogResult>(AddChapterDialogComponent, {
      data: { 
        defaultName: `Chapter ${(s.chapters?.length ?? 0) + 1}`,
        tab: 'pgn'
      }
    });

    dialogRef.closed.subscribe((result) => {
      if (result?.pgn) {
        this.executePgnImport(s.id, result.pgn);
      }
    });
  }

  private executePgnImport(studyId: number, pgn: string) {
    this.studyService.importPgn(studyId, pgn).subscribe({
      next: (res) => {
        const firstNewChapter = (res.data?.chapters || res.chapters)?.[0];
        this.studyService.getStudy(studyId, firstNewChapter?.id);
        this.toastService.show(res.message || 'Import successful!', 'success');
      },
      error: (err) => {
        console.error('Import failed:', err);
        this.toastService.show('Failed to import PGN. Please check the format.', 'error');
      },
    });
  }

  exportPgn() {
    const s = this.study();
    if (!s) return;
    this.studyService.exportPgn(s.id);
  }

  confirmDeleteStudy() {
    this.showDeleteModal.set(true);
  }

  onDeleteConfirmed() {
    const s = this.study();
    if (!s) return;

    this.isDeleting.set(true);
    this.studyService.deleteStudy(s.id).subscribe({
      next: () => {
        this.toastService.show('Study deleted successfully', 'success');
        this.router.navigate(['/study']);
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
      },
      error: () => {
        this.toastService.show('Failed to delete study', 'error');
        this.isDeleting.set(false);
      }
    });
  }

  openSettings() {
    if (!this.isOwner()) return;
    const s = this.study();
    if (!s) return;

    const dialogRef = this.dialog.open(StudySettingsDialogComponent, {
      data: {
        name: s.name,
        visibility: s.visibility
      }
    });

    dialogRef.closed.subscribe((result: any) => {
      if (!result) return;

      if (result.action === 'delete') {
        this.confirmDeleteStudy();
      } else if (result.action === 'save' && result.name) {
        this.studyService.updateStudy(s.id, {
          name: result.name,
          visibility: result.visibility
        }).subscribe({
          next: () => {
            this.toastService.show('Study updated', 'success');
            this.studyService.getStudy(s.id);
          },
          error: (err) => {
            console.error('Failed to update study:', err);
            this.toastService.show('Failed to update study', 'error');
          }
        });
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return this.formatDate(dateStr);
  }

  onBoardSizeChange(size: number) {
    this.boardSize.set(size);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--board-size', `${size}px`);
    }
  }
}
