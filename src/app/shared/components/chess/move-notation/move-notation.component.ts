import {
  Component,
  input,
  output,
  computed,
  ElementRef,
  HostListener,
  effect,
  signal,
  viewChild,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ButtonComponent } from '@shared/ui';
import { MoveNode, GLYPH_MAPPING } from '../../../../core/models/study.model';
import { buildTreeFromMoves, findNodeContext } from '../../../../core/utils/chess-tree.utils';
import { AudioService } from '../../../../core/services/audio.service';

@Component({
  selector: 'app-move-notation',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './move-notation.component.html',
  host: {
    class: 'flex flex-col min-h-0 h-full',
  },
})
export class MoveNotationComponent {
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);
  
  glyphMapping = GLYPH_MAPPING;

  getGlyph(id: number) {
    return (this.glyphMapping as any)[id];
  }

  // Advanced Move Tree (Used by Study)
  moveTree = input<MoveNode[]>([]);
  // Legacy Flat Moves (Used by everything else)
  moves = input<string[]>([]);

  layout = input<'grid' | 'inline'>('inline');

  currentFen = input<string>('');
  currentPly = input<number>(0);
  initialPly = input<number>(0);
  result = input<string | null | undefined>(null);
  showNavigation = input<boolean>(false);

  // Outputs
  navigate = output<number>();
  nodeClicked = output<MoveNode>();
  deleteFromHere = output<MoveNode>();
  annotateMove = output<MoveNode>();

  // Context Menu State
  contextMenuNode = signal<MoveNode | null>(null);
  contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // Navigation Selection State
  selectedVariationIndex = signal(0);

  scrollContainer = viewChild<ElementRef>('scrollContainer');

  constructor() {
    effect(() => {
      // Trigger scroll when currentFen changes
      this.currentFen();
      
      if (isPlatformBrowser(this.platformId)) {
        // Use requestAnimationFrame to wait for the DOM to update the .active-move class
        requestAnimationFrame(() => {
          this.scrollToActiveMove();
        });
      }
    });
  }

  private scrollToActiveMove() {
    const container = this.scrollContainer()?.nativeElement;
    if (!container) return;

    const activeMove = container.querySelector('.active-move');

    if (activeMove) {
      activeMove.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }

  // Automatically determine which data source to use
  effectiveTree = computed(() => {
    const tree = this.moveTree();
    if (tree && tree.length > 0) return tree;

    const flatMoves = this.moves();
    if (flatMoves && flatMoves.length > 0) {
      return buildTreeFromMoves(flatMoves);
    }
    return [];
  });

  mainlineTurns = computed(() => {
    const tree = this.effectiveTree();
    if (tree.length === 0) return [];

    const turns: {
      moveNumber: number;
      white?: MoveNode;
      black?: MoveNode;
    }[] = [];

    tree.forEach((node) => {
      const isWhite = node.ply % 2 !== 0;
      const moveNumber = isWhite ? (node.ply + 1) / 2 : node.ply / 2;

      let turn = turns.find((t) => t.moveNumber === moveNumber);
      if (!turn) {
        turn = { moveNumber };
        turns.push(turn);
      }

      if (isWhite) {
        turn.white = node;
      } else {
        turn.black = node;
      }
    });

    turns.sort((a, b) => a.moveNumber - b.moveNumber);
    return turns;
  });

  // Determine current navigation context (successors and parent)
  navigationCtx = computed(() => {
    const fen = this.currentFen();
    const ply = this.currentPly();
    const initialPly = this.initialPly();
    const tree = this.effectiveTree();
    
    if (ply <= initialPly || tree.length === 0) {
      // At the start of the game/chapter
      return {
        current: null,
        next: tree.length > 0 ? [tree[0], ...(tree[0].variations?.map((v) => v[0]) || [])] : [],
        parent: null,
      };
    }

    // Try finding by FEN first (most accurate for trees)
    if (fen) {
      const context = findNodeContext(tree, fen);
      if (context.current) return context;
    }

    // Fallback: If we only have ply and it's a simple mainline, try to find by ply
    // This is useful for flat move lists where FEN might not be perfectly synchronized
    const nodeByPly = this.findNodeByPlyMainline(tree, ply);
    if (nodeByPly) {
      return findNodeContext(tree, nodeByPly.fen);
    }

    return { current: null, next: [], parent: null };
  });

  private findNodeByPlyMainline(nodes: MoveNode[], ply: number): MoveNode | null {
    // Only search mainline for ply match as ply is not unique in trees
    return nodes.find((n) => n.ply === ply) || null;
  }

  nextOptions = computed(() => this.navigationCtx().next);

  isLastMove = computed(() => this.nextOptions().length === 0);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.showNavigation()) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    const options = this.nextOptions();
    const hasMultiple = options.length > 1;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        const parent = this.navigationCtx().parent;
        if (parent) {
          this.onMoveClick(parent);
        } else {
          this.navigate.emit(this.initialPly()); // Go to start
          this.audioService.playNavigationSound();
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (options.length > 0) {
          const idx = Math.min(this.selectedVariationIndex(), options.length - 1);
          this.onMoveClick(options[idx]);
          this.selectedVariationIndex.set(0); // Reset for next move
        }
        break;
      case 'ArrowUp':
        if (hasMultiple) {
          event.preventDefault();
          this.selectedVariationIndex.update((i) => (i > 0 ? i - 1 : options.length - 1));
          this.audioService.playNavigationSound();
        } else {
          event.preventDefault();
          this.navigate.emit(this.initialPly());
          this.audioService.playNavigationSound();
        }
        break;
      case 'ArrowDown':
        if (hasMultiple) {
          event.preventDefault();
          this.selectedVariationIndex.update((i) => (i < options.length - 1 ? i + 1 : 0));
          this.audioService.playNavigationSound();
        } else {
          event.preventDefault();
          const tree = this.effectiveTree();
          this.navigate.emit(tree.length > 0 ? tree[tree.length - 1].ply : this.initialPly());
          this.audioService.playNavigationSound();
        }
        break;
      case 'Home':
        event.preventDefault();
        this.navigate.emit(this.initialPly());
        this.audioService.playNavigationSound();
        break;
      case 'End':
        event.preventDefault();
        const tree = this.effectiveTree();
        this.navigate.emit(tree.length > 0 ? tree[tree.length - 1].ply : this.initialPly());
        this.audioService.playNavigationSound();
        break;
    }
  }

  onContextMenu(event: MouseEvent, node: MoveNode) {
    event.preventDefault();
    this.contextMenuNode.set(node);
    this.contextMenuPos.set({ x: event.clientX, y: event.clientY });
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuNode.set(null);
  }

  onDeleteFromHere() {
    const node = this.contextMenuNode();
    if (node) {
      this.deleteFromHere.emit(node);
    }
    this.closeContextMenu();
  }

  onAnnotate() {
    const node = this.contextMenuNode();
    if (node) {
      this.annotateMove.emit(node);
    }
    this.closeContextMenu();
  }

  onMoveClick(node: MoveNode) {
    this.navigate.emit(node.ply);
    this.nodeClicked.emit(node);
    this.audioService.playMoveSound(node.san);
  }

  onNavigateBack() {
    const parent = this.navigationCtx().parent;
    if (parent) {
      this.onMoveClick(parent);
    } else {
      this.navigate.emit(this.initialPly());
    }
  }

  onNavigateNext() {
    const options = this.nextOptions();
    if (options.length > 0) {
      // Preference: current selected variation or mainline
      const idx = Math.min(this.selectedVariationIndex(), options.length - 1);
      this.onMoveClick(options[idx]);
      this.selectedVariationIndex.set(0);
    }
  }
}
