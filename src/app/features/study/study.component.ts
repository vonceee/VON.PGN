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
import { BackLinkComponent } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronRight } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, MoveNotationComponent, FormsModule, BackLinkComponent],
  providers: [provideIcons({ heroChevronRight })],
  templateUrl: './study.component.html',
  host: {
    class: 'absolute inset-0 overflow-hidden',
  },
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
  activeTab = signal<'notation' | 'info'>('notation');

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
    if (!this.isOwner()) return;

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
    this.studyService.emitMove(san, fen, this.moveTree());
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
    if (this.isSyncing() && !this.isOwner()) return;
    this.updateCurrentPosition(node);
    if (this.isOwner()) {
      this.studyService.emitNavigation(node.fen, this.moveTree());
    }
  }

  onDeleteFromHere(target: MoveNode) {
    if (!this.isOwner()) return;

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
      this.studyService.emitMove(
        '', // No specific move made, just tree update
        this.currentFen(),
        tree
      );
    }
  }

  private deleteFromHereRecursive(nodes: MoveNode[], target: MoveNode): MoveNode[] {
    const index = nodes.findIndex((n) => n.fen === target.fen && n.ply === target.ply);
    if (index !== -1) {
      // Found the target in this list, truncate from here
      return nodes.slice(0, index);
    }

    for (const node of nodes) {
      if (node.variations) {
        for (let i = 0; i < node.variations.length; i++) {
          node.variations[i] = this.deleteFromHereRecursive(node.variations[i], target);
        }
        // Filter out any variations that are now empty
        node.variations = node.variations.filter((v) => v.length > 0);
      }
    }
    return nodes;
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
      // Default: Maximize based on viewport height (approx 70% of height)
      return Math.min(800, Math.floor(window.innerHeight * 0.7));
    }
    return 500;
  }

  @HostListener('window:resize')
  onResize() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Only auto-resize if the user hasn't explicitly saved a size or if it overflows
    const maxAllowed = Math.floor(window.innerHeight * 0.72);
    if (this.boardSize() > maxAllowed) {
      this.boardSize.set(maxAllowed);
    }
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
