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
  HostListener,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroQueueList, heroInformationCircle, heroTag, heroBookOpen, heroChatBubbleLeftRight, heroQuestionMarkCircle, heroPlay, heroStop, heroArrowsRightLeft } from '@ng-icons/heroicons/outline';
import { Router } from '@angular/router';
import { StudyService } from '../../core/services/study.service';
import { AudioService } from '../../core/services/audio.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { AuthService } from '../../core/services/auth.service';
import { ChessBoardComponent, EvalBarComponent } from '@shared/chess';
import { MoveNotationComponent } from '@shared/chess';
import { FormsModule } from '@angular/forms';
import { fromEvent } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';
import { MoveNode, GLYPH_MAPPING, StudyChapter } from '../../core/models/study.model';
import { buildTreeFromMoves, updateNodeInTree, getPlyFromFen, findNodeContext } from '../../core/utils/chess-tree.utils';
import { EngineService } from '../../core/services/engine.service';
import { ConfirmDeleteModalComponent } from '@shared/feedback';
import { AnnotateMoveDialogComponent } from './dialogs/annotate-move-dialog/annotate-move-dialog.component';
import { StudySidebarComponent } from './study-sidebar/study-sidebar.component';
import { StudyInfoComponent } from './study-info/study-info.component';
import { JoinClassDialogComponent } from './dialogs/join-class-dialog/join-class-dialog.component';
import { ToastService } from '../../core/services/toast.service';
import { StudyAnalysisComponent } from './study-analysis/study-analysis.component';
import { StudyMetadataComponent } from './study-metadata/study-metadata.component';
import { StudyMetadataTabComponent } from './study-metadata-tab/study-metadata-tab.component';
import { EditMetadataDialogComponent } from './dialogs/edit-metadata-dialog/edit-metadata-dialog.component';
import { DevLogger } from '../../core/utils/dev-logger';
import { ShortcutsDialogComponent } from './dialogs/shortcuts-dialog/shortcuts-dialog.component';
import { StartClassDialogComponent } from './dialogs/start-class-dialog/start-class-dialog.component';
import { LayoutService } from '../../core/services/layout.service';
import { RequestControlDialogComponent } from './dialogs/request-control-dialog/request-control-dialog.component';
import { ReceiveRequestDialogComponent } from './dialogs/receive-request-dialog/receive-request-dialog.component';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
    ChessBoardComponent,
    EvalBarComponent,
    MoveNotationComponent,
    FormsModule,
    DialogModule,
    ConfirmDeleteModalComponent,
    StudySidebarComponent,
    StudyInfoComponent,
    StudyAnalysisComponent,
    StudyMetadataComponent,
    StudyMetadataTabComponent,
    StartClassDialogComponent,
    JoinClassDialogComponent,
  ],
  providers: [provideIcons({ heroQueueList, heroInformationCircle, heroTag, heroBookOpen, heroChatBubbleLeftRight, heroQuestionMarkCircle, heroPlay, heroStop, heroArrowsRightLeft })],
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private destroyRef = inject(DestroyRef);
  private layoutService = inject(LayoutService);
  private toastService = inject(ToastService);

  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  isLoading = this.studyService.isLoading;
  viewerCount = this.studyService.viewerCount;
  
  id = input.required<string>();
  chapterId = input<string | undefined>(undefined, { alias: 'chapter' });

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

  // Engine analysis input (declarative)
  analysisInput = computed(() => {
    const active = this.isEngineActive() && this.isEngineVisible() && this.activeTab() === 'notation';
    // Include multiPvCount so that changing settings re-triggers analysis
    return active ? { fen: this.currentFen(), active: true, multiPv: this.multiPvCount() } : null;
  });

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

  activeGlyphs = computed(() => {
    const node = this.currentNode();
    if (!node || !node.glyphs || node.glyphs.length === 0 || !node.uci) return [];

    const destSquare = node.uci.slice(2, 4);
    // Only show move evaluations (!, ?, !!, ??, !?, ?!, □, ⊙) on the board
    const boardGlyphIds = [1, 2, 3, 4, 5, 6, 7, 22];
    
    return node.glyphs
      .filter(id => boardGlyphIds.includes(id))
      .map(id => {
        const g = GLYPH_MAPPING[id];
        return g ? { square: destSquare, symbol: g.symbol, class: g.class } : null;
      })
      .filter((g): g is { square: string; symbol: string; class: string } => !!g);
  });

  /**
   * Determines whether the current user is the owner of this study.
   *
   * WHY: The backend UserProfileResource serializes `id` as `uid`, making
   * a direct `user.id === study.user_id` comparison fail silently (comparing
   * undefined === undefined, which would default to true for every user).
   * The null-guard `!!(myUid && ownerId && ...)` prevents false-positive matches.
   *
   * ASSUMPTIONS/EDGE CASES:
   * - Falls back to `user.id` if `user.uid` is absent (guest/legacy sessions).
   * - Falls back to `s.owner?.id` if `s.user_id` is absent (older API shapes).
   */
  isOwner = computed(() => {
    const user = this.authService.currentUser();
    const s = this.study();
    if (!user || !s) return false;
    const myUid = user.uid || user.id;
    const studyOwnerId = s.user_id || (s as any).userId || s.owner?.id;
    return !!(myUid && studyOwnerId && String(myUid) === String(studyOwnerId));
  });

  /**
   * Determines whether the current user may save and broadcast moves/annotations.
   *
   * WHY: Centralizes the three-tier permission hierarchy (class session → owner →
   * collaborator) into a single reactive gate so every write operation can
   * simply guard with `if (!this.canEdit()) return` without duplicating logic.
   *
   * TRADEOFF: During an active class session the entire permission hierarchy is
   * bypassed in favour of board-control lock ownership. This means even the study
   * owner cannot edit while a student holds the chalk — intentional for
   * classroom coherence.
   */
  canEdit = computed(() => {
    if (this.studyService.isClassActive()) {
      return this.studyService.hasBoardControl();
    }

    if (this.isOwner()) return true;
    const user = this.authService.currentUser();
    const s = this.study();
    if (!user || !s) return false;
    const myUid = user.uid || user.id;
    return s.collaborators?.find(c => myUid && String(c.uid) === String(myUid))?.can_edit ?? false;
  });

  /**
   * Controls whether pieces can be physically dragged on the chessboard.
   *
   * WHY: Decouples the board's drag interactivity from save permissions. Every
   * visitor (owner, member, guest) should be able to explore positions freely
   * by dragging pieces. Whether the resulting move is persisted is determined
   * separately inside `onMoveMade()` via `canEdit()`. Conflating these two
   * concerns (as the old `[interactive]="canEdit()"` binding did) caused guests
   * and view-only members to get a completely frozen board.
   *
   * TRADEOFF: A guest's local move tree diverges from the saved study after
   * any drag. This is intentional — the ephemeral session resets on page
   * reload, preserving the canonical study state for authenticated editors.
   */
  boardInteractive = computed(() => {
    // CRITICAL: hasBoardControl() encodes the full joined/not-joined logic for
    // class sessions — do not inline-replace this with isClassActive() alone.
    if (this.studyService.isClassActive()) {
      // If student is joined but doesn't have control, we keep board interactive
      // so their move attempt triggers the request dialog in onMoveMade()
      if (!this.isOwner() && this.hasJoinedClass() && !this.hasBoardControl()) {
        return true;
      }
      return this.studyService.hasBoardControl();
    }
    return true;
  });

  isClassActive = this.studyService.isClassActive;
  lockHolderId = this.studyService.lockHolderId;
  hasBoardControl = this.studyService.hasBoardControl;
  hasJoinedClass = this.studyService.hasJoinedClass;

  toggleClassSession() {
    if (this.isClassActive()) {
      // End immediately — no confirmation needed
      this.studyService.endClass();
      return;
    }
    // Show confirmation dialog via signal
    this.showStartClassDialog.set(true);
  }

  onStartClassConfirmed() {
    this.showStartClassDialog.set(false);
    this.studyService.startClass();
  }

  onStartClassCancelled() {
    this.showStartClassDialog.set(false);
  }

  joinClassSession() {
    this.studyService.hasJoinedClass.set(true);
    this.toastService.show('Joined live classroom session!', 'success');
  }

  showJoinClassDialog = signal(false);

  openJoinClassDialog() {
    this.showJoinClassDialog.set(true);
  }

  onJoinClassConfirmed() {
    this.showJoinClassDialog.set(false);
    this.joinClassSession();
  }

  onJoinClassCancelled() {
    this.showJoinClassDialog.set(false);
    this.toastService.show('Exploring freely. You can join the class anytime using the banner.');
  }

  isSyncing = signal(true);
  isLargeScreen = signal(false);
  isThreeColumn = signal(false);
  isTwoColumn = signal(false);
  activeTab = signal<'notation' | 'info' | 'metadata' | 'chapters' | 'chat'>('notation');
  showDeleteModal = signal(false);
  showStartClassDialog = signal(false);
  isDeleting = signal(false);
  isActionInProgress = signal(false);
  private lastChapterId: number | null = null;
  private lastChapterOrientation: 'white' | 'black' | null = null;
  private pvChess = new Chess();

  isEngineVisible = computed(() => {
    const s = this.study();
    if (!s) return false;
    if (s.engine_visibility === 'everyone') return true;
    return this.isOwner();
  });

  constructor() {
    effect(() => {
      const active = this.isClassActive();
      const isOwner = this.isOwner();
      if (active && !isOwner) {
        this.ngZone.run(() => {
          this.openJoinClassDialog();
        });
      }
    });

    // Engine Analysis Side-Effect
    toObservable(this.analysisInput)
      .pipe(
        takeUntilDestroyed(),
        debounceTime(150),
        filter((v): v is { fen: string; active: boolean; multiPv: number } => !!v && v.active)
      )
      .subscribe(({ fen }) => this.engineService.startAnalysis(fen));

    effect(() => {
      const chapter = this.currentChapter();
      if (!chapter) return;

      const targetOrientation = chapter.orientation || 'white';

      // Sync orientation IF chapter changed OR chapter orientation setting changed
      if (this.lastChapterId !== chapter.id || this.lastChapterOrientation !== targetOrientation) {
        this.boardOrientation.set(targetOrientation);
        this.lastChapterOrientation = targetOrientation;
      }

      if (this.lastChapterId !== chapter.id) {
        this.lastChapterId = chapter.id;
        this.moveTree.set(buildTreeFromMoves(chapter.moves || [], chapter.initial_fen));
        this.updateCurrentPosition(null);
      }
    });

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
      }
    });

    effect(() => {
      // Synchronize boards instantly if class session is active and this user is a follower
      const isClassActive = this.studyService.isClassActive();
      const hasControl = this.studyService.hasBoardControl();

      if (isClassActive && !hasControl && this.studyService.lastRemoteState().chapterId && !this.isActionInProgress()) {
        this.syncToRemoteState();
      }
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
      } else {
        this.engineService.stop();
        this.engineEval.set(null);
        this.enginePvLines.set([]);
        this.engineArrows.set([]);
      }
    });

    effect(() => {
      const studyId = this.id();
      const chapId = this.chapterId();
      if (studyId && isPlatformBrowser(this.platformId)) {
        this.studyService.getStudy(Number(studyId), chapId ? Number(chapId) : undefined);
      }
    });

    effect(() => {
      const s = this.study();
      const user = this.authService.currentUser();
      if (s && user) {
        const myUid = user.uid || user.id;
        const collaborator = s.collaborators?.find(c => myUid && String(c.uid) === String(myUid));
        if (collaborator) {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => this.isSyncing.set(collaborator.is_syncing), 0);
          });
        }
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.updateLayoutStates();
      fromEvent(window, 'resize')
        .pipe(takeUntilDestroyed(), debounceTime(100))
        .subscribe(() => {
          this.updateLayoutStates();
        });
    }
  }

  private updateLayoutStates() {
    const width = window.innerWidth;
    this.isLargeScreen.set(width >= 1024);
    this.isThreeColumn.set(width >= 1280);
    this.isTwoColumn.set(width >= 1024 && width < 1280);
    
    // If we move back to 3-column and were on a sidebar tab, move back to notation
    if (this.isThreeColumn() && (this.activeTab() === 'chapters' || this.activeTab() === 'chat')) {
      this.activeTab.set('notation');
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
  }

  private syncToRemoteState() {
    const remote = this.studyService.lastRemoteState();
    if (!remote.chapterId) return;

    const isChapterChange = String(this.currentChapter()?.id) !== String(remote.chapterId);
    this.executeSync(remote, isChapterChange);
  }

  private executeSync(remote: any, isChapterChange: boolean) {
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
      if (remote.orientation) {
        this.boardOrientation.set(remote.orientation);
      }
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

  /**
   * Handles a move completed on the chessboard by any user.
   *
   * WHY: Moves are always applied to the local signal tree immediately so
   * every visitor (including unauthenticated guests) gets a responsive,
   * explorable board. The decision to persist is a separate concern gated by
   * `canEdit()`, keeping the UI layer decoupled from authorization.
   *
   * TRADEOFF: A guest's or view-only member's local move tree diverges from
   * the canonical study after a drag. This is intentional — the ephemeral
   * session state resets on page reload, preserving the saved study for
   * authenticated editors.
   */
  onMoveMade(event: any) {
    // Classroom guard: If student attempts to move during class without board control
    if (this.isClassActive() && !this.isOwner() && this.hasJoinedClass() && !this.hasBoardControl()) {
      // 1. Instantly reset FEN locally to prevent the piece from staying on the board
      const current = this.currentFen();
      this.currentFen.set('');
      setTimeout(() => this.currentFen.set(current), 0);

      // 2. Open Request Control Dialog
      const dialogRef = this.dialog.open<boolean>(RequestControlDialogComponent, {
        width: '450px',
        maxWidth: '90vw',
        backdropClass: ['bg-black/5'],
      });

      dialogRef.closed.subscribe((requested) => {
        if (requested) {
          const user = this.authService.currentUser();
          const userId = String(user?.uid || user?.id || '');
          const userName = String(user?.username || user?.displayName || user?.name || 'Student');
          this.studyService.requestMovePermission(userId, userName);
          this.toastService.show('Move permission request sent to tutor!', 'success');
        }
      });
      return;
    }

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

    if (this.canEdit()) {
      this.studyService.emitMove(san, fen, this.moveTree(), this.boardOrientation(), this.isSyncing()).subscribe();
    }
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
    // WHY: During an active class session, joined followers are locked to the
    // teacher's board position — allowing them to navigate independently would
    // desync the shared board state. Outside a class (or for non-joined viewers)
    // navigation is always local and never broadcasts to other clients.
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;
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

  onPromoteToMainline(target: MoveNode) {
    if (!this.canEdit()) return;

    this.isActionInProgress.set(true);

    this.moveTree.update(tree => {
      const treeCopy = JSON.parse(JSON.stringify(tree)); // Deep copy to guarantee pure reactivity
      const res = this.findVariationBranch(treeCopy, target.fen, target.ply);
      if (res) {
        const { parentList, variationIndex, branchIndex } = res;
        const i = variationIndex;
        const j = branchIndex;
        const V = parentList[i].variations[j];

        // Sibling 1 (old mainline path slice starting at index i)
        const oldMainlinePath = [...parentList.slice(i)];
        const siblingVars = oldMainlinePath[0].variations || [];
        const remainingSiblings = siblingVars.filter((_, idx) => idx !== j);

        // Demote old mainline path to a side variation
        oldMainlinePath[0].variations = [];

        // Assign the previous mainline and other siblings as sibling branches under the promoted move
        V[0].variations = [oldMainlinePath, ...remainingSiblings];

        // Splay in the promoted branch
        parentList.splice(i, parentList.length - i, ...V);
      }
      return treeCopy;
    });

    // Align user's selected node selection and board navigation context to the newly promoted move
    const updatedTree = this.moveTree();
    const nodeInPromotedTree = this.findNodeRecursive(updatedTree, target.fen);
    if (nodeInPromotedTree) {
      this.updateCurrentPosition(nodeInPromotedTree);
    }

    // Broadcast updated moves tree to backend and collaborators
    this.studyService.emitMove('', this.currentFen(), this.moveTree(), this.boardOrientation(), this.isSyncing())
      .subscribe({
        next: () => this.isActionInProgress.set(false),
        error: () => this.isActionInProgress.set(false),
        complete: () => this.isActionInProgress.set(false)
      });
  }

  private findVariationBranch(
    nodes: MoveNode[],
    targetFen: string,
    targetPly: number
  ): { parentList: MoveNode[]; variationIndex: number; branchIndex: number } | null {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.variations) {
        for (let j = 0; j < node.variations.length; j++) {
          const variation = node.variations[j];
          const foundIdx = variation.findIndex(n => n.fen === targetFen && n.ply === targetPly);
          if (foundIdx !== -1) {
            return { parentList: nodes, variationIndex: i, branchIndex: j };
          }
          const res = this.findVariationBranch(variation, targetFen, targetPly);
          if (res) return res;
        }
      }
    }
    return null;
  }

  onNavigateToPly(ply: number) {
    // WHY: See onNodeClicked — same class-session lock rationale applies.
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;
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

  onPrevMove() {
    // WHY: See onNodeClicked — same class-session lock rationale applies.
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;
    
    const context = findNodeContext(this.moveTree(), this.currentFen());
    if (context.parent) {
      this.onNodeClicked(context.parent);
    } else if (this.currentNode()) {
      // Go to start
      this.updateCurrentPosition(null);
      this.remoteShapes.set([]);
      this.engineArrows.set([]);
      this.audioService.playNavigationSound();
      if (this.canEdit()) {
        this.studyService.emitNavigation(
          this.currentChapter()?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing()
        );
      }
    }
  }

  onNextMove() {
    // WHY: See onNodeClicked — same class-session lock rationale applies.
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;

    const tree = this.moveTree();
    if (tree.length === 0) return;

    if (!this.currentNode()) {
      // Go to first move
      this.onNodeClicked(tree[0]);
      return;
    }

    const context = findNodeContext(tree, this.currentFen());
    if (context.next.length > 0) {
      this.onNodeClicked(context.next[0]);
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
    this.layoutService.setFluid(true);
    if (isPlatformBrowser(this.platformId)) {
      // Listen for incoming move permission requests (Tutor side)
      this.studyService.onMovePermissionRequested$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(payload => {
          if (this.isOwner()) {
            this.ngZone.run(() => {
              const dialogRef = this.dialog.open<'grant' | 'decline'>(ReceiveRequestDialogComponent, {
                width: '450px',
                maxWidth: '90vw',
                data: { userName: payload.userName },
                backdropClass: ['bg-black/5']
              });

              dialogRef.closed.subscribe(action => {
                if (action === 'grant') {
                  this.studyService.grantBoardControl(payload.userId);
                } else if (action === 'decline') {
                  this.studyService.declineMovePermission(payload.userId);
                }
              });
            });
          }
        });

      // Listen for declined move permission requests (Student side)
      this.studyService.onMovePermissionDeclined$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(payload => {
          const user = this.authService.currentUser();
          const myUid = String(user?.uid || user?.id || '');
          if (String(payload.targetUserId) === myUid) {
            this.toastService.show('Your tutor declined the move request.', 'error');
          }
        });
      this.engineService.analysis$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(analysis => {
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
        });

      this.studyService.onShapesDrawn$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(payload => {
          this.ngZone.run(() => {
            const myUid = this.authService.currentUser()?.uid || this.authService.currentUser()?.id;
            if (String(payload.userId) !== String(myUid)) this.remoteShapes.set(payload.shapes || []);
          });
        });
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

  ngOnDestroy() { 
    this.studyService.disconnect(); 
    this.layoutService.setFluid(false);
  }

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
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ignore if typing in any input/textarea/editable
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    const key = event.key;
    const keyLower = key.toLowerCase();

    // --- 1. Global Study Shortcuts (Available to everyone) ---

    // Flip Board
    if (keyLower === 'f') {
      event.preventDefault();
      this.flipBoard();
      return;
    }

    // Toggle Engine
    if (keyLower === 'l' && this.isEngineVisible()) {
      event.preventDefault();
      this.toggleEngine();
      return;
    }

    // Next / Previous Chapter
    if (event.shiftKey && key === 'ArrowRight') {
      event.preventDefault();
      this.nextChapter();
      return;
    }
    if (event.shiftKey && key === 'ArrowLeft') {
      event.preventDefault();
      this.prevChapter();
      return;
    }

    // --- 2. Editor Shortcuts (Require canEdit permissions) ---
    if (!this.canEdit()) return;

    const node = this.currentNode();
    if (!node) return;
    
    // Handle Dialog opening (A or Enter)
    if (keyLower === 'a' || (key === 'Enter' && !event.shiftKey && !event.ctrlKey)) {
      event.preventDefault();
      this.onAnnotateMove(node);
      return;
    }

    // Handle Quick Evaluations
    let glyphId: number | null = null;
    
    // Plain keys 1-8 for Move Evaluations
    if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
      const moveEvals: Record<string, number> = { 
        '1': 1,  // !
        '2': 2,  // ?
        '3': 3,  // !!
        '4': 4,  // ??
        '5': 5,  // !?
        '6': 6,  // ?!
        '7': 7,  // □
        '8': 22  // ⊙
      };
      if (moveEvals[key]) glyphId = moveEvals[key];
      else if (key === '0') glyphId = 0; // Clear all
    } 
    // Shift + 1-6 for Positional Evaluations
    else if (event.shiftKey && !event.ctrlKey && !event.altKey) {
       const posEvals: Record<string, number> = { 
         '1': 10, // =
         '2': 16, // ±
         '3': 17, // ∓
         '4': 18, // +-
         '5': 19, // -+
         '6': 13  // ∞
       };
       if (posEvals[key]) {
         glyphId = posEvals[key];
       }
    }

    if (glyphId !== null) {
      event.preventDefault();
      this.quickAnnotate(node, glyphId);
    }
  }

  private quickAnnotate(node: MoveNode, glyphId: number) {
    this.moveTree.update(tree => 
      updateNodeInTree(tree, node.fen, node.ply, {
        glyphs: glyphId === 0 ? [] : [glyphId]
      })
    );
    
    // Broadcast and save to backend
    this.studyService.emitMove(
      '', 
      this.currentFen(), 
      this.moveTree(), 
      this.boardOrientation(), 
      this.isSyncing()
    ).subscribe();
    
    this.audioService.playNavigationSound(); // Subtle feedback
  }

  selectChapter(chap: StudyChapter) {
    if (this.currentChapter()?.id === chap.id) return;

    this.studyService.currentChapter.set(chap);
    if (this.canEdit()) {
      this.studyService.emitChapterChange(
        this.study()!.id,
        chap.id,
        chap.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        chap.moves || [],
        chap.orientation,
        this.isSyncing()
      );
    }
  }

  nextChapter() {
    const s = this.study();
    const current = this.currentChapter();
    if (!s || !s.chapters || !current) return;

    const currentIndex = s.chapters.findIndex(c => c.id === current.id);
    if (currentIndex !== -1 && currentIndex < s.chapters.length - 1) {
      const nextChap = s.chapters[currentIndex + 1];
      this.selectChapter(nextChap);
      this.toastService.show(`Switched to chapter: ${nextChap.name}`, 'success');
      this.audioService.playNavigationSound();
    } else {
      this.toastService.show('Already on the last chapter.', 'success');
    }
  }

  prevChapter() {
    const s = this.study();
    const current = this.currentChapter();
    if (!s || !s.chapters || !current) return;

    const currentIndex = s.chapters.findIndex(c => c.id === current.id);
    if (currentIndex > 0) {
      const prevChap = s.chapters[currentIndex - 1];
      this.selectChapter(prevChap);
      this.toastService.show(`Switched to chapter: ${prevChap.name}`, 'success');
      this.audioService.playNavigationSound();
    } else {
      this.toastService.show('Already on the first chapter.', 'success');
    }
  }

  openShortcuts() {
    this.dialog.open(ShortcutsDialogComponent);
  }
}
