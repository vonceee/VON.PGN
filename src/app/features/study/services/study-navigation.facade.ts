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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudyService } from '../../../core/services/study.service';
import { AudioService } from '../../../core/services/audio.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { OpeningService } from '../../../core/services/opening.service';
import { MoveNode, StudyChapter, StudySyncedPayload } from '../../../core/models/study.model';
import {
  buildTreeFromMoves,
  updateNodeInTree,
  getPlyFromFen,
  findNodeContext,
  findNodeRecursive,
  insertNodeDeep,
  deleteFromHereRecursive,
  findVariationBranch,
  findPathToFen,
} from '../../../core/utils/chess-tree.utils';
function cleanFen(fen: string): string {
  if (!fen) return '';
  return fen.trim().split(/\s+/).slice(0, 2).join(' ');
}

@Injectable({
  providedIn: 'root',
})
export class StudyNavigationFacade {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private audioService = inject(AudioService);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);
  private openingService = inject(OpeningService);

  // Expose Study Service States
  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;

  // Local States
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  // Derived chess opening information based on current FEN position
  // TRADEOFF: Traverses backwards through the active moves path to find the nearest matching opening
  // to ensure that once an opening is identified, it remains visible as the user continues playing moves.
  openingInfo = computed(() => {
    const map = this.openingService.openingsMap();
    if (!map) return null;

    // 1. Check current FEN for a direct book match
    const fen = this.currentFen();
    const normCurrentFen = this.openingService.normalizeFen(fen);
    const directMatch = map[normCurrentFen];
    if (directMatch) return directMatch;

    // 2. If no direct match, traverse backwards through the active move path to find the nearest matching opening
    const path = this.activePath();
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (node.fen) {
        const normFen = this.openingService.normalizeFen(node.fen);
        const match = map[normFen];
        if (match) return match;
      }
    }

    // 3. Fallback: check the initial FEN of the chapter
    const initialFen = this.currentChapter()?.initial_fen;
    if (initialFen) {
      const normInitialFen = this.openingService.normalizeFen(initialFen);
      const match = map[normInitialFen];
      if (match) return match;
    }

    return null;
  });

  openingName = computed(() => this.openingInfo()?.name || null);
  openingEco = computed(() => this.openingInfo()?.eco || null);

  moveTree = signal<MoveNode[]>([]);
  currentNode = signal<MoveNode | null>(null);
  currentPly = signal(0);
  boardOrientation = signal<'white' | 'black'>('white');
  remoteShapes = signal<any[]>([]);
  isSyncing = signal(true);
  isActionInProgress = signal(false);
  activeTab = signal<'notation' | 'chapters' | 'chat'>('notation');
  activeSection = signal<'chapters' | 'add-chapter' | 'settings' | 'members' | 'chat' | 'export' | 'annotate'>('chapters');
  splitSection = signal<'chat' | null>(null);

  private lastChapterId: number | null = null;
  private lastChapterOrientation: 'white' | 'black' | null = null;

  // Computed player tags, results, active path, and clock states
  tags = computed(() => this.currentChapter()?.pgn_tags || {});
  result = computed(() => this.tags()['Result'] || '*');

  whitePlayer = computed(() => {
    const name = this.tags()['White'] || 'White';
    const elo = this.tags()['WhiteElo'];
    const title = this.tags()['WhiteTitle'];
    return { name, elo, title };
  });

  blackPlayer = computed(() => {
    const name = this.tags()['Black'] || 'Black';
    const elo = this.tags()['BlackElo'];
    const title = this.tags()['BlackTitle'];
    return { name, elo, title };
  });

  activePath = computed(() => {
    const tree = this.moveTree();
    const fen = this.currentFen();
    if (!tree || !fen) return [];
    return findPathToFen(tree, fen) || [];
  });

  whiteClock = computed(() => {
    const path = this.activePath();
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (node.ply % 2 !== 0 && node.clk) {
        return node.clk;
      }
    }
    return undefined;
  });

  blackClock = computed(() => {
    const path = this.activePath();
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (node.ply % 2 === 0 && node.clk) {
        return node.clk;
      }
    }
    return undefined;
  });

  activeColor = computed(() => {
    const fen = this.currentFen();
    if (!fen) return 'w';
    const parts = fen.split(' ');
    return parts[1] || 'w';
  });

  topPlayerColor = computed(() => (this.boardOrientation() === 'white' ? 'black' : 'white'));
  bottomPlayerColor = computed(() => (this.boardOrientation() === 'white' ? 'white' : 'black'));

  topPlayer = computed(() => (this.topPlayerColor() === 'white' ? this.whitePlayer() : this.blackPlayer()));
  bottomPlayer = computed(() => (this.bottomPlayerColor() === 'white' ? this.whitePlayer() : this.blackPlayer()));

  topClock = computed(() => (this.topPlayerColor() === 'white' ? this.whiteClock() : this.blackClock()));
  bottomClock = computed(() => (this.bottomPlayerColor() === 'white' ? this.whiteClock() : this.blackClock()));

  isTopPlayerTurn = computed(() => {
    const active = this.activeColor();
    const color = this.topPlayerColor();
    return (active === 'w' && color === 'white') || (active === 'b' && color === 'black');
  });

  isBottomPlayerTurn = computed(() => {
    const active = this.activeColor();
    const color = this.bottomPlayerColor();
    return (active === 'w' && color === 'white') || (active === 'b' && color === 'black');
  });

  getPlayerResult(color: 'white' | 'black'): string {
    const r = this.result();
    if (r === '1-0') return color === 'white' ? '1' : '0';
    if (r === '0-1') return color === 'white' ? '0' : '1';
    if (r === '1/2-1/2') return '½';
    return '';
  }

  mergedShapes = computed(() => {
    const remote = this.remoteShapes();
    if (remote && remote.length > 0) return remote;
    const node = this.currentNode();
    return node?.shapes || [];
  });

  initialPly = computed(() => {
    const chapter = this.currentChapter();
    const fenPly = getPlyFromFen(chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    if (chapter?.pgn_tags) {
      const tags = chapter.pgn_tags;
      for (const key of Object.keys(tags)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'startply' || lowerKey === 'guessstartply') {
          const val = parseInt(tags[key], 10);
          if (!isNaN(val)) return Math.max(fenPly, val);
        } else if (lowerKey === 'startmove' || lowerKey === 'guessstartmove') {
          const val = parseInt(tags[key], 10);
          if (!isNaN(val)) return Math.max(fenPly, (val - 1) * 2);
        }
      }
    }
    return fenPly;
  });

  lastMoveSquares = computed(() => {
    const node = this.currentNode();
    if (!node || !node.uci || node.uci.length < 4) return undefined;
    return [node.uci.slice(0, 2), node.uci.slice(2, 4)] as any[];
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
    return (
      s.collaborators?.find((c) => myUid && String(c.uid) === String(myUid))?.can_edit ?? false
    );
  });

  boardInteractive = computed(() => {
    if (this.studyService.isClassActive()) {
      if (!this.isOwner() && this.studyService.hasJoinedClass() && !this.studyService.hasBoardControl()) {
        return true;
      }
      return this.studyService.hasBoardControl();
    }
    return true;
  });

  constructor() {
    this.setupEffects();
    this.setupSubscriptions();
  }

  private setupEffects() {
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

    effect(() => {
      const isClassActive = this.studyService.isClassActive();
      const isOwner = this.isOwner();
      const hasJoined = this.studyService.hasJoinedClass();

      if (
        isClassActive &&
        (isOwner || hasJoined) &&
        this.studyService.lastRemoteState().chapterId &&
        !this.isActionInProgress()
      ) {
        this.syncToRemoteState();
      }
    });
  }

  private setupSubscriptions() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.studyService.onShapesDrawn$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        this.ngZone.run(() => {
          this.remoteShapes.set(payload.shapes || []);
        });
      });

    this.studyService.onSynced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state: StudySyncedPayload) => {
        this.ngZone.run(() => {
          if (state.shapes && state.shapes.length > 0) {
            this.remoteShapes.set(state.shapes);
          }
        });
      });
  }

  private syncToRemoteState() {
    const remote = this.studyService.lastRemoteState();
    if (!remote.chapterId) return;

    const isChapterChange = String(this.currentChapter()?.id) !== String(remote.chapterId);
    this.executeSync(remote, isChapterChange);
  }

  private executeSync(remote: any, isChapterChange: boolean) {
    if (!isChapterChange && cleanFen(this.currentFen()) === cleanFen(remote.fen)) {
      return;
    }

    const sameChapter = !remote.shapesChapterId || String(remote.shapesChapterId) === String(remote.chapterId);
    const sameFen = !remote.shapesFen || cleanFen(remote.shapesFen) === cleanFen(remote.fen);
    if (remote.shapes && remote.shapes.length > 0 && sameChapter && sameFen) {
      this.remoteShapes.set(remote.shapes);
    } else {
      this.remoteShapes.set([]);
    }
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
      this.studyService.hasJoinedClass() &&
      !this.studyService.hasBoardControl()
    ) {
      if (boardUndo) boardUndo();
      return; // Handled at wrapper/facade coordinator level for showing dialog if needed
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
        if (!current) {
          if (t.length === 0) {
            return [newNode];
          }
          const firstNode = t[0];
          if (firstNode.san !== newNode.san && firstNode.uci !== newNode.uci) {
            const updatedFirstNode = { ...firstNode };
            if (!updatedFirstNode.variations) {
              updatedFirstNode.variations = [];
            }
            const exists = updatedFirstNode.variations.some(
              (v) => v.length > 0 && (v[0].san === newNode.san || v[0].uci === newNode.uci)
            );
            if (!exists) {
              updatedFirstNode.variations = [
                ...updatedFirstNode.variations.map((v) => [...v]),
                [newNode],
              ];
            }
            return [updatedFirstNode, ...t.slice(1)];
          }
          return t;
        }
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
    this.updateCurrentPosition(node);
    this.activeSection.set('annotate');
  }

  saveAnnotation(node: MoveNode, comment: string, glyphs: number[]) {
    if (!this.canEdit()) return;

    this.moveTree.update((tree) =>
      updateNodeInTree(tree, node.fen, node.ply, {
        comments: comment.trim() ? [comment.trim()] : [],
        glyphs: glyphs,
      })
    );

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

  saveStartComment(comment: string) {
    if (!this.canEdit()) return;

    this.moveTree.update((tree) => {
      if (tree.length > 0) {
        tree[0] = {
          ...tree[0],
          preComments: comment.trim() ? [comment.trim()] : [],
        };
      }
      return [...tree];
    });

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

  onShapeDrawn(shapes: any[]) {
    if (this.isSyncing()) {
      this.studyService.emitShapes(shapes, this.currentChapter()?.id, this.currentFen());
    }

    // Only save shapes to the database moves tree if studying alone (not syncing in a class)
    if (!this.isSyncing()) {
      const node = this.currentNode();
      if (node) {
        this.moveTree.update((tree) =>
          updateNodeInTree(tree, node.fen, node.ply, {
            shapes: shapes,
          })
        );

        this.currentNode.set({
          ...node,
          shapes: shapes,
        });

        this.studyService
          .emitMove(
            '',
            this.currentFen(),
            this.moveTree(),
            this.boardOrientation(),
            false,
            false
          )
          .subscribe();
      }
    }
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

  flipBoard(currentOrientation: 'white' | 'black', callback: (newO: 'white' | 'black') => void) {
    const newO = currentOrientation === 'white' ? 'black' : 'white';
    callback(newO);
    if (this.isSyncing() && this.canEdit()) {
      this.studyService.emitNavigation(this.currentFen(), this.moveTree(), newO, true);
    }
  }
}
