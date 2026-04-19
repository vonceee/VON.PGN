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
import { buildTreeFromMoves } from '../../core/utils/chess-tree.utils';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, MoveNotationComponent, FormsModule],
  templateUrl: './study.component.html',
  styleUrls: ['./study.component.css'],
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

    const studyOwnerId = s.user_id || (s as any).userId || s.owner?.id;
    const currentUserId = user.id || user.uid;

    return String(studyOwnerId) === String(currentUserId);
  });

  isSyncing = signal(true);
  activeTab = signal<'chapters' | 'info'>('chapters');

  private subs = new Subscription();
  private lastChapterId: number | null = null;

  constructor() {
    effect(() => {
      const chapter = this.currentChapter();
      if (chapter) {
        const shouldJump = this.lastChapterId !== chapter.id;
        this.lastChapterId = chapter.id;

        if (shouldJump) {
          this.currentFen.set(chapter.current_fen);
          const tree = buildTreeFromMoves(chapter.moves || [], chapter.initial_fen);
          this.moveTree.set(tree);

          // Only jump to end if we're the owner OR if we are NOT sync-locked
          if (!this.isSyncing() || this.isOwner()) {
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
      const isOwner = this.isOwner();
      const remoteState = this.studyService.lastRemoteState();

      if (isSyncing && !isOwner && remoteState.chapterId) {
        this.syncToRemoteState();
      }
    });
  }

  toggleSync() {
    this.isSyncing.update((v) => !v);
    if (this.isSyncing()) {
      this.syncToRemoteState();
    }
  }

  private syncToRemoteState() {
    const remote = this.studyService.lastRemoteState();
    if (!remote.chapterId) return;

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
      // Try to find the node in the new tree to highlight it
      const node = this.findNodeRecursive(this.moveTree(), remote.fen);
      if (node) {
        this.currentNode.set(node);
        this.currentPly.set(node.ply);
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
      this.currentNode.set(node);
      this.currentFen.set(node.fen);
      this.currentPly.set(node.ply);
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
    if (!this.isOwner()) return;

    const current = this.currentNode();
    const newNode: MoveNode = {
      san: event.san,
      uci: event.from + event.to,
      fen: event.fen,
      ply: (current?.ply || 0) + 1,
      variations: [],
    };

    this.moveTree.update((tree) => {
      if (!current) return [...tree, newNode];
      return this.insertNode(tree, current, newNode);
    });

    this.updateCurrentPosition(newNode);
    this.studyService.emitMove(event.san, event.fen, this.moveTree());
  }

  private insertNode(nodes: MoveNode[], parent: MoveNode, newNode: MoveNode): MoveNode[] {
    const index = nodes.findIndex((n) => n.fen === parent.fen && n.ply === parent.ply);

    if (index !== -1) {
      if (index === nodes.length - 1) {
        nodes.push(newNode);
      } else {
        const nextInLine = nodes[index + 1];
        if (nextInLine.san !== newNode.san) {
          if (!nextInLine.variations) nextInLine.variations = [];
          const existingVar = nextInLine.variations.find((v) => v[0].san === newNode.san);
          if (!existingVar) nextInLine.variations.push([newNode]);
        }
      }
      return [...nodes];
    }

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
    if (this.isSyncing() && !this.isOwner()) return;
    this.updateCurrentPosition(node);
    if (this.isOwner()) {
      this.studyService.emitNavigation(node.fen, this.moveTree());
    }
  }

  onNavigateToPly(ply: number) {
    if (this.isSyncing() && !this.isOwner()) return;
    if (ply === 0) {
      this.updateCurrentPosition(null);
      if (this.isOwner()) {
        const chapter = this.currentChapter();
        this.studyService.emitNavigation(
          chapter?.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          this.moveTree(),
        );
      }
      return;
    }
    // Note: this only navigates mainline. For variations, nodeClicked is used.
    const node = this.moveTree().find((n) => n.ply === ply);
    if (node) {
      this.updateCurrentPosition(node);
      if (this.isOwner()) {
        this.studyService.emitNavigation(node.fen, this.moveTree());
      }
    }
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
      this.subs.add(
        this.route.params.subscribe((p) => p['id'] && this.studyService.getStudy(p['id'])),
      );
    }
  }

  ngOnDestroy() {
    this.studyService.disconnect();
    this.subs.unsubscribe();
  }

  selectChapter(chap: any) {
    if (this.isSyncing() && !this.isOwner()) return;
    if (this.currentChapter()?.id === chap.id) return;
    this.studyService.currentChapter.set(chap);
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
        this.studyService.getStudy(s.id);
        this.studyService.currentChapter.set(newChapter);
      },
    });
  }

  onShapeDrawn(shapes: any[]) {
    if (this.isOwner()) this.studyService.emitShapes(shapes);
  }

  importPgn() {
    const pgn = prompt('Paste your Lichess Study PGN here:');
    if (!pgn) return;
    const s = this.study();
    if (!s) return;

    this.studyService.importPgn(s.id, pgn).subscribe({
      next: (res) => {
        this.studyService.getStudy(s.id); // Refresh study
        alert(res.message || 'Import successful!');
      },
      error: (err) => {
        console.error('Import failed:', err);
        alert('Failed to import PGN. Please check the format.');
      },
    });
  }

  exportPgn() {
    const s = this.study();
    if (!s) return;
    this.studyService.exportPgn(s.id);
  }

  onBoardSizeChange(size: number) {
    this.boardSize.set(size);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--board-size', `${size}px`);
    }
  }
}
