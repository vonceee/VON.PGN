import {
  Injectable,
  inject,
  signal,
  effect,
  computed,
  PLATFORM_ID,
  NgZone,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';

import { StudyService } from '../../../core/services/study.service';
import { AudioService } from '../../../core/services/audio.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { WebrtcService } from '../../../core/services/webrtc.service';
import { MoveNode, GLYPH_MAPPING, StudyChapter } from '../../../core/models/study.model';
import {
  buildTreeFromMoves,
  updateNodeInTree,
  getPlyFromFen,
  findNodeContext,
  findNodeRecursive,
  insertNodeDeep,
  deleteFromHereRecursive,
  findVariationBranch,
} from '../../../core/utils/chess-tree.utils';

import { AnnotateMoveDialogComponent } from '../dialogs/annotate-move-dialog/annotate-move-dialog.component';
import { RequestControlDialogComponent } from '../dialogs/request-control-dialog/request-control-dialog.component';
import { ReceiveRequestDialogComponent } from '../dialogs/receive-request-dialog/receive-request-dialog.component';
import { EditMetadataDialogComponent } from '../dialogs/edit-metadata-dialog/edit-metadata-dialog.component';
import { EngineService } from '../../../core/services/engine.service';

@Injectable()
export class StudyFacade {
  private studyService = inject(StudyService);
  public engineService = inject(EngineService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private audioService = inject(AudioService);
  private router = inject(Router);
  private dialog = inject(Dialog);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);
  private webrtc = inject(WebrtcService);

  // Expose Study Service States
  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  isLoading = this.studyService.isLoading;
  viewerCount = this.studyService.viewerCount;
  viewerNames = this.studyService.viewerNames;
  classStartedAt = this.studyService.classStartedAt;

  // Local States (Including Engine)
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  moveTree = signal<MoveNode[]>([]);
  currentNode = signal<MoveNode | null>(null);
  currentPly = signal(0);
  boardOrientation = signal<'white' | 'black'>('white');
  remoteShapes = signal<any[]>([]);
  activeTab = signal<'notation' | 'chapters' | 'chat'>('notation');

  isEngineActive = signal(false);
  showEngineSettings = signal(false);
  classDuration = signal<string>('00:00');
  private classTimerId: any = null;

  // Expose engine signals for UI binding
  engineDepth = this.engineService.engineDepth;
  engineNodes = this.engineService.engineNodes;
  engineNps = this.engineService.engineNps;
  isEngineError = this.engineService.isError;
  pvLines = this.engineService.pvLines;
  multiPv = this.engineService.multiPv;
  searchMode = this.engineService.searchMode;

  formattedPvLines = computed(() => {
    const lines = this.pvLines();
    const fen = this.currentFen();
    if (lines.length === 0 || !fen) return [];

    return lines.map((line) => {
      const chess = new Chess(fen);
      const moves: { san: string; uci: string; moveNumber: number; showMoveNumber: boolean; isBlack: boolean }[] = [];

      for (let i = 0; i < line.pv.length; i++) {
        const uci = line.pv[i];
        const currentTurn = chess.turn();
        const currentMoveNumber = chess.moveNumber();
        const showMoveNumber = i === 0 || currentTurn === 'w';
        const isBlack = i === 0 && currentTurn === 'b';

        try {
          const from = uci.substring(0, 2);
          const to = uci.substring(2, 4);
          const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;
          const result = chess.move({ from, to, promotion });
          moves.push({
            san: result.san,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        } catch (e) {
          // Fallback to raw UCI in case of parsing/move error
          moves.push({
            san: uci,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        }
      }

      return {
        ...line,
        moves,
      };
    });
  });

  formattedNps = computed(() => {
    const nps = this.engineNps();
    if (nps >= 1_000_000) return `${(nps / 1_000_000).toFixed(1)}M nps`;
    if (nps >= 1_000) return `${(nps / 1_000).toFixed(0)}k nps`;
    return nps > 0 ? `${nps} nps` : '';
  });

  engineEval = computed(() => {
    const lines = this.pvLines();
    return lines.length > 0 ? lines[0].eval : null;
  });

  isEngineVisible = computed(() => {
    const s = this.study();
    if (!s) return false;
    if (s.engine_visibility === 'owner') {
      return this.isOwner();
    }
    return true;
  });

  showDeleteModal = signal(false);
  showStartClassDialog = signal(false);
  showEndClassDialog = signal(false);
  showJoinClassDialog = signal(false);
  isDeleting = signal(false);
  isActionInProgress = signal(false);
  isSyncing = signal(true);

  private lastChapterId: number | null = null;
  private lastChapterOrientation: 'white' | 'black' | null = null;

  // Computed properties
  mergedShapes = computed(() => this.remoteShapes());

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
    const boardGlyphIds = [1, 2, 3, 4, 5, 6, 7, 22];

    return node.glyphs
      .filter((id) => boardGlyphIds.includes(id))
      .map((id) => {
        const g = GLYPH_MAPPING[id];
        return g ? { square: destSquare, symbol: g.symbol, class: g.class } : null;
      })
      .filter((g): g is { square: string; symbol: string; class: string } => !!g);
  });

  isOwner = this.studyService.isOwner;

  canEdit = computed(() => {
    if (this.studyService.isClassActive()) {
      return this.studyService.hasBoardControl();
    }

    if (this.isOwner()) return true;
    const user = this.authService.currentUser();
    const s = this.study();
    if (!user || !s) return false;
    const myUid = user.uid || user.id;
    return s.collaborators?.find((c) => myUid && String(c.uid) === String(myUid))?.can_edit ?? false;
  });

  boardInteractive = computed(() => {
    if (this.studyService.isClassActive()) {
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

  constructor() {
    this.setupEffects();
    this.setupSubscriptions();
  }

  private setupEffects() {
    effect(() => {
      const startedAt = this.classStartedAt();
      const isBrowser = isPlatformBrowser(this.platformId);

      if (this.classTimerId) {
        clearInterval(this.classTimerId);
        this.classTimerId = null;
      }

      if (isBrowser && startedAt) {
        const updateTimer = () => {
          const start = new Date(startedAt).getTime();
          const now = Date.now();
          const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
          const hours = Math.floor(diffSeconds / 3600);
          const minutes = Math.floor((diffSeconds % 3600) / 60);
          const seconds = diffSeconds % 60;

          if (hours > 0) {
            this.classDuration.set(
              `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
          } else {
            this.classDuration.set(
              `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
          }
        };

        updateTimer();
        this.ngZone.runOutsideAngular(() => {
          this.classTimerId = setInterval(() => {
            this.ngZone.run(() => {
              updateTimer();
            });
          }, 1000);
        });
      } else {
        this.classDuration.set('00:00');
      }
    });

    effect(() => {
      const active = this.isEngineActive();
      const fen = this.currentFen();
      const isBrowser = isPlatformBrowser(this.platformId);

      if (isBrowser) {
        if (active && fen) {
          this.engineService.startAnalysis(fen);
        } else {
          this.engineService.stop();
        }
      }
    });

    effect(() => {
      const active = this.isClassActive();
      const isOwner = this.isOwner();
      if (active && !isOwner) {
        this.ngZone.run(() => {
          this.showJoinClassDialog.set(true);
        });
      }
    });

    effect(() => {
      const chapter = this.currentChapter();
      if (!chapter) return;

      const targetOrientation = chapter.orientation || 'white';

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
      const isClassActive = this.studyService.isClassActive();
      const isOwner = this.isOwner();
      const hasJoined = this.hasJoinedClass();

      if (
        isClassActive &&
        (isOwner || hasJoined) &&
        this.studyService.lastRemoteState().chapterId &&
        !this.isActionInProgress()
      ) {
        this.syncToRemoteState();
      }
    });

    effect(() => {
      const studyId = this.router.url.split('/study/')[1]?.split('?')[0]?.split('#')[0];
      const chapId = this.router.url.split('chapter=')[1]?.split('&')[0];
      if (studyId && isPlatformBrowser(this.platformId)) {
        if (!this.study() || String(this.study()?.id) !== String(studyId)) {
          this.studyService.getStudy(Number(studyId), chapId ? Number(chapId) : undefined);
        }
      }
    });

    effect(() => {
      const s = this.study();
      const user = this.authService.currentUser();
      if (s && user) {
        const myUid = user.uid || user.id;
        const collaborator = s.collaborators?.find(
          (c) => myUid && String(c.uid) === String(myUid)
        );
        if (collaborator) {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => this.isSyncing.set(collaborator.is_syncing), 0);
          });
        }
      }
    });
  }

  private setupSubscriptions() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Listen for incoming move permission requests (Tutor side)
    this.studyService.onMovePermissionRequested$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (this.isOwner()) {
          this.ngZone.run(() => {
            const dialogRef = this.dialog.open<'grant' | 'decline'>(
              ReceiveRequestDialogComponent,
              {
                width: '450px',
                maxWidth: '90vw',
                data: { userName: payload.userName },
                backdropClass: ['bg-black/50'],
                disableClose: true,
              }
            );

            dialogRef.closed.subscribe((action) => {
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
      .subscribe((payload) => {
        const user = this.authService.currentUser();
        const myUid = String(user?.uid || user?.id || '');
        if (String(payload.targetUserId) === myUid) {
          this.toastService.show('Your tutor declined the move request.', 'error');
        }
      });

    this.studyService.onShapesDrawn$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        this.ngZone.run(() => {
          const myUid = this.authService.currentUser()?.uid || this.authService.currentUser()?.id;
          if (String(payload.userId) !== String(myUid)) {
            this.remoteShapes.set(payload.shapes || []);
          }
        });
      });
  }

  toggleClassSession() {
    if (this.isClassActive()) {
      this.showEndClassDialog.set(true);
      return;
    }
    this.showStartClassDialog.set(true);
  }

  onStartClassConfirmed() {
    this.showStartClassDialog.set(false);
    this.studyService.startClass();
  }

  onStartClassCancelled() {
    this.showStartClassDialog.set(false);
  }

  onEndClassConfirmed() {
    this.showEndClassDialog.set(false);
    this.studyService.endClass();
  }

  onEndClassCancelled() {
    this.showEndClassDialog.set(false);
  }

  joinClassSession() {
    this.studyService.hasJoinedClass.set(true);
    this.toastService.show('Joined live classroom session!', 'success');
  }

  onJoinClassConfirmed() {
    this.showJoinClassDialog.set(false);
    this.joinClassSession();
  }

  onJoinClassCancelled() {
    this.showJoinClassDialog.set(false);
    this.toastService.show('Exploring freely. You can join the class anytime using the banner.');
  }

  toggleSync() {
    this.isSyncing.update((v) => !v);
    if (this.isSyncing()) this.syncToRemoteState();
  }

  flipBoard(currentOrientation: 'white' | 'black', callback: (newO: 'white' | 'black') => void) {
    const newO = currentOrientation === 'white' ? 'black' : 'white';
    callback(newO);
    if (this.isSyncing() && this.canEdit()) {
      this.studyService.emitNavigation(
        this.currentFen(),
        this.moveTree(),
        newO,
        true
      );
    }
  }

  private syncToRemoteState() {
    const remote = this.studyService.lastRemoteState();
    if (!remote.chapterId) return;

    const isChapterChange = String(this.currentChapter()?.id) !== String(remote.chapterId);
    this.executeSync(remote, isChapterChange);
  }

  private executeSync(remote: any, isChapterChange: boolean) {
    if (!isChapterChange && this.currentFen() === remote.fen) {
      return;
    }

    this.remoteShapes.set([]);
    if (this.currentChapter()?.id !== remote.chapterId) {
      const target = this.study()?.chapters?.find(
        (c) => String(c.id) === String(remote.chapterId)
      );
      if (target) this.studyService.currentChapter.set(target);
    }
    if (remote.moves) this.moveTree.set(buildTreeFromMoves(remote.moves));
    if (remote.fen) {
      this.currentFen.set(remote.fen);
      if (remote.orientation) {
        this.boardOrientation.set(remote.orientation);
      }
      const node = findNodeRecursive(this.moveTree(), remote.fen);
      this.currentNode.set(node);
      this.currentPly.set(node?.ply || this.initialPly());
    }
  }

  public updateCurrentPosition(node: MoveNode | null) {
    if (node && node.fen && node.fen.trim()) {
      this.currentNode.set(node);
      this.currentFen.set(node.fen);
      this.currentPly.set(node.ply);
    } else {
      const chapter = this.currentChapter();
      this.currentNode.set(null);
      this.currentFen.set(
        chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
      this.currentPly.set(this.initialPly());
    }
  }

  private goToLastMainlineNode() {
    const tree = this.moveTree();
    this.updateCurrentPosition(tree.length > 0 ? tree[tree.length - 1] : null);
  }

  onMoveMade(event: any, boardUndo?: () => void) {
    // Classroom guard: If student attempts to move during class without board control
    if (
      this.studyService.isClassActive() &&
      !this.isOwner() &&
      this.hasJoinedClass() &&
      !this.hasBoardControl()
    ) {
      if (boardUndo) boardUndo();

      const dialogRef = this.dialog.open<boolean>(RequestControlDialogComponent, {
        width: '450px',
        maxWidth: '90vw',
        backdropClass: ['bg-black/50'],
      });

      dialogRef.closed.subscribe((requested) => {
        if (requested) {
          const user = this.authService.currentUser();
          const userId = String(user?.uid || user?.id || '');
          const userName = String(
            user?.username || user?.displayName || user?.name || 'Student'
          );
          this.studyService.requestMovePermission(userId, userName);
          this.toastService.show('Move permission request sent to tutor!', 'success');
        }
      });
      return;
    }

    const move = event.move || event;
    const san = String(move.san || '');
    const uci = String(move.from || '') + String(move.to || '');
    const fen = String(event.fen || '');
    const current = this.currentNode();

    // Check if the move already exists in the tree as a next step
    let existingNode: MoveNode | undefined;
    const tree = this.moveTree();

    if (!current) {
      if (tree.length > 0) {
        const firstNode = tree[0];
        if (firstNode.san === san || firstNode.uci === uci) {
          existingNode = firstNode;
        } else if (firstNode.variations) {
          for (const variation of firstNode.variations) {
            if (variation.length > 0 && (variation[0].san === san || variation[0].uci === uci)) {
              existingNode = variation[0];
              break;
            }
          }
        }
      }
    } else {
      const context = findNodeContext(tree, current.fen);
      existingNode = context.next.find((n) => n.san === san || n.uci === uci);
    }

    if (existingNode) {
      this.updateCurrentPosition(existingNode);
      this.remoteShapes.set([]);
      this.audioService.playChessMove(move);

      if (this.canEdit()) {
        this.studyService.emitNavigation(
          existingNode.fen,
          tree,
          this.boardOrientation(),
          this.isSyncing()
        );
      }
    } else {
      const newNode: MoveNode = {
        san,
        uci,
        fen,
        ply: (current?.ply || this.initialPly()) + 1,
        variations: [],
        comments: [],
      };

      this.moveTree.update((t) => {
        if (!current) return [...t, newNode];
        const newTree = insertNodeDeep(t, current.ply, current.fen, newNode);
        return newTree.length > 0 ? newTree : [...t, newNode];
      });

      this.updateCurrentPosition(newNode);
      this.remoteShapes.set([]);
      this.audioService.playChessMove(move);

      if (this.canEdit()) {
        this.studyService.emitMove(
          san,
          fen,
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing()
        ).subscribe();
      }
    }
  }

  onNodeClicked(node: MoveNode) {
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;
    this.updateCurrentPosition(node);
    this.remoteShapes.set([]);
    this.audioService.playMoveSound(node.san);
    if (this.canEdit()) {
      this.studyService.emitNavigation(
        node.fen,
        this.moveTree(),
        this.boardOrientation(),
        this.isSyncing()
      );
    }
  }

  onDeleteFromHere(target: MoveNode) {
    if (!this.canEdit()) return;

    this.isActionInProgress.set(true);

    this.moveTree.update((tree) => deleteFromHereRecursive(tree, target));

    const tree = this.moveTree();
    if (this.currentNode() && !findNodeRecursive(tree, this.currentNode()!.fen)) {
      this.goToLastMainlineNode();
    }

    this.studyService
      .emitMove(
        '',
        this.currentFen(),
        this.moveTree(),
        this.boardOrientation(),
        this.isSyncing(),
        true
      )
      .subscribe({
        next: () => this.isActionInProgress.set(false),
        error: () => this.isActionInProgress.set(false),
        complete: () => this.isActionInProgress.set(false),
      });
  }

  onPromoteToMainline(target: MoveNode) {
    if (!this.canEdit()) return;

    this.isActionInProgress.set(true);

    this.moveTree.update((tree) => {
      const treeCopy = JSON.parse(JSON.stringify(tree));
      const res = findVariationBranch(treeCopy, target.fen, target.ply);
      if (res) {
        const { parentList, variationIndex, branchIndex } = res;
        const i = variationIndex;
        const j = branchIndex;
        const V = parentList[i].variations[j];

        const oldMainlinePath = [...parentList.slice(i)];
        const siblingVars = oldMainlinePath[0].variations || [];
        const remainingSiblings = siblingVars.filter((_, idx) => idx !== j);

        oldMainlinePath[0].variations = [];
        V[0].variations = [oldMainlinePath, ...remainingSiblings];

        parentList.splice(i, parentList.length - i, ...V);
      }
      return treeCopy;
    });

    const updatedTree = this.moveTree();
    const nodeInPromotedTree = findNodeRecursive(updatedTree, target.fen);
    if (nodeInPromotedTree) {
      this.updateCurrentPosition(nodeInPromotedTree);
    }

    this.studyService
      .emitMove(
        '',
        this.currentFen(),
        this.moveTree(),
        this.boardOrientation(),
        this.isSyncing(),
        true
      )
      .subscribe({
        next: () => this.isActionInProgress.set(false),
        error: () => this.isActionInProgress.set(false),
        complete: () => this.isActionInProgress.set(false),
      });
  }

  onNavigateToPly(ply: number) {
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;
    if (ply <= this.initialPly()) {
      this.updateCurrentPosition(null);
      if (this.canEdit()) {
        this.studyService.emitNavigation(
          this.currentChapter()?.initial_fen ||
          'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing()
        );
      }
      return;
    }
    const node = this.moveTree().find((n) => n.ply === ply);
    if (node) {
      this.updateCurrentPosition(node);
      this.remoteShapes.set([]);
      this.audioService.playMoveSound(node.san);
      if (this.canEdit()) {
        this.studyService.emitNavigation(
          node.fen,
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing()
        );
      }
    }
  }

  onPrevMove() {
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;

    const context = findNodeContext(this.moveTree(), this.currentFen());
    if (context.parent) {
      this.onNodeClicked(context.parent);
    } else if (this.currentNode()) {
      this.updateCurrentPosition(null);
      this.remoteShapes.set([]);
      this.audioService.playNavigationSound();
      if (this.canEdit()) {
        this.studyService.emitNavigation(
          this.currentChapter()?.initial_fen ||
          'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          this.moveTree(),
          this.boardOrientation(),
          this.isSyncing()
        );
      }
    }
  }

  onNextMove() {
    if (this.studyService.isClassActive() && !this.studyService.hasBoardControl()) return;

    const tree = this.moveTree();
    if (tree.length === 0) return;

    if (!this.currentNode()) {
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
      width: '600px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/60'],
      data: node,
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        this.moveTree.update((tree) =>
          updateNodeInTree(tree, node.fen, node.ply, {
            comments: result.comment ? [result.comment] : [],
            glyphs: result.glyphs,
          })
        );

        // Update the current node reference so the UI commentary updates instantly
        const updatedNode = findNodeRecursive(this.moveTree(), node.fen);
        if (updatedNode && (!this.currentNode() || this.currentNode()?.fen === node.fen)) {
          this.currentNode.set(updatedNode);
        }

        this.studyService
          .emitMove(
            '',
            this.currentFen(),
            this.moveTree(),
            this.boardOrientation(),
            this.isSyncing(),
            true
          )
          .subscribe();
      }
    });
  }

  onDeleteConfirmed(onSuccess: () => void) {
    if (!this.study()) return;
    this.isDeleting.set(true);
    this.studyService.deleteStudy(this.study()!.id).subscribe({
      next: () => {
        onSuccess();
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
      },
      error: () => this.isDeleting.set(false),
    });
  }

  onShapeDrawn(shapes: any[]) {
    if (this.canEdit()) this.studyService.emitShapes(shapes);
  }

  onSaveMetadata(tags: Record<string, string>) {
    const s = this.study();
    const c = this.currentChapter();
    if (!s || !c || !this.canEdit()) return;

    this.studyService
      .updateChapter(s.id, c.id, {
        name: c.name,
        orientation: c.orientation,
        pgn_tags: tags,
      })
      .subscribe({
        next: () => {
          this.currentChapter.update((prev) => (prev ? { ...prev, pgn_tags: tags } : null));
          this.studyService.getStudy(s.id);
        },
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

  quickAnnotate(node: MoveNode, glyphId: number) {
    this.moveTree.update((tree) =>
      updateNodeInTree(tree, node.fen, node.ply, {
        glyphs: glyphId === 0 ? [] : [glyphId],
      })
    );

    this.studyService
      .emitMove(
        '',
        this.currentFen(),
        this.moveTree(),
        this.boardOrientation(),
        this.isSyncing()
      )
      .subscribe();

    this.audioService.playNavigationSound();
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

    const currentIndex = s.chapters.findIndex((c) => c.id === current.id);
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

    const currentIndex = s.chapters.findIndex((c) => c.id === current.id);
    if (currentIndex > 0) {
      const prevChap = s.chapters[currentIndex - 1];
      this.selectChapter(prevChap);
      this.toastService.show(`Switched to chapter: ${prevChap.name}`, 'success');
      this.audioService.playNavigationSound();
    } else {
      this.toastService.show('Already on the first chapter.', 'success');
    }
  }

  cleanup() {
    this.studyService.disconnect();
    this.webrtc.leaveCall();
    this.engineService.terminate();
    if (this.classTimerId) {
      clearInterval(this.classTimerId);
      this.classTimerId = null;
    }
  }
}
