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
import { MoveNode, GLYPH_MAPPING } from '../../../../core/models/study.model';
import { buildTreeFromMoves, findNodeContext } from '../../../../core/utils/chess-tree.utils';
import { AudioService } from '../../../../core/services/audio.service';

@Component({
  selector: 'app-move-notation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './move-notation.component.html',
  styles: [
    `
      .notation-glyph-badge {
        min-width: 20px;
        height: 18px;
        padding: 0 4px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: 'Outfit', 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 11px;
        font-weight: 900;
        font-style: italic;
        letter-spacing: -0.04em;
        line-height: 1;
        color: #ffffff;
        transform: skewX(-4deg);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        user-select: none;
        flex-shrink: 0;
      }

      .notation-glyph-badge.glyph-brilliant {
        background: #0891b2;
      }
      .notation-glyph-badge.glyph-good {
        background: #6320ee;
      }
      .notation-glyph-badge.glyph-interesting {
        background: #db2777;
      }
      .notation-glyph-badge.glyph-dubious {
        background: #d97706;
      }
      .notation-glyph-badge.glyph-mistake {
        background: #ea580c;
      }
      .notation-glyph-badge.glyph-blunder {
        background: #dc2626;
      }
      .notation-glyph-badge.glyph-novelty,
      .notation-glyph-badge:not([class*='glyph-']) {
        background: #2563eb;
      }

      /* Inline tree/variation glyph text colors */
      .glyph-text-brilliant {
        color: #0891b2;
      }
      .glyph-text-good {
        color: #538d4e;
      }
      .glyph-text-interesting {
        color: #db2777;
      }
      .glyph-text-dubious {
        color: #d97706;
      }
      .glyph-text-mistake {
        color: #b45309;
      }
      .glyph-text-blunder {
        color: #dc2626;
      }
      .glyph-text-novelty,
      .glyph-text-default {
        color: #2563eb;
      }
    `,
  ],
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


  getMoveQualityGlyph(glyphs?: number[]): { symbol: string; name: string; class: string } | null {
    if (!glyphs || glyphs.length === 0) return null;
    const gId = glyphs.find(id => [1, 2, 3, 4, 5, 6].includes(Number(id)));
    if (!gId || !this.glyphMapping[gId]) return null;
    return this.glyphMapping[gId];
  }

  getSecondaryGlyphs(glyphs?: number[]): { symbol: string; name: string; class: string }[] {
    if (!glyphs || glyphs.length === 0) return [];
    return glyphs
      .filter(id => ![1, 2, 3, 4, 5, 6].includes(Number(id)) && this.glyphMapping[id])
      .map(id => this.glyphMapping[id]);
  }

  // Advanced Move Tree (Used by Study)
  moveTree = input<MoveNode[]>([]);
  // Legacy Flat Moves (Used by everything else)
  moves = input<string[]>([]);

  layout = input<'grid' | 'inline' | 'tree'>('inline');

  currentFen = input<string>('');
  initialFen = input<string>('');
  currentPly = input<number>(0);
  initialPly = input<number>(0);
  result = input<string | null | undefined>(null);
  showNavigation = input<boolean>(false);
  enableKeyboardNavigation = input<boolean>(true);

  // Outputs
  navigate = output<number>();
  nodeClicked = output<MoveNode>();
  deleteFromHere = output<MoveNode>();
  annotateMove = output<MoveNode>();
  promoteToMainline = output<MoveNode>();

  // Context Menu State
  contextMenuNode = signal<MoveNode | null>(null);
  contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  isContextMenuNodeMainline = signal<boolean>(true);

  // Navigation Selection State
  selectedVariationIndex = signal(0);

  // Active Layout State
  activeLayout = computed(() => {
    const initial = this.layout();
    return initial === 'inline' ? 'tree' : initial;
  });

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
      return buildTreeFromMoves(flatMoves, this.initialFen());
    }
    return [];
  });

  mainlineTurns = computed(() => {
    const tree = this.effectiveTree();
    if (tree.length === 0) return [];

    interface MainlineRow {
      id: string;
      moveNumber: number;
      white?: MoveNode;
      black?: MoveNode;
      showWhiteEllipsis?: boolean;
      showBlackEllipsis?: boolean;
    }

    const turnsMap = new Map<number, { moveNumber: number; white?: MoveNode; black?: MoveNode }>();

    tree.forEach((node) => {
      const isWhite = node.ply % 2 !== 0;
      const moveNumber = isWhite ? (node.ply + 1) / 2 : node.ply / 2;

      let turn = turnsMap.get(moveNumber);
      if (!turn) {
        turn = { moveNumber };
        turnsMap.set(moveNumber, turn);
      }

      if (isWhite) {
        turn.white = node;
      } else {
        turn.black = node;
      }
    });

    const sortedMoveNumbers = Array.from(turnsMap.keys()).sort((a, b) => a - b);
    const rows: MainlineRow[] = [];

    sortedMoveNumbers.forEach((moveNumber) => {
      const turn = turnsMap.get(moveNumber)!;
      const whiteHasVariations = !!(turn.white && turn.white.variations && turn.white.variations.length > 0);

      if (whiteHasVariations && turn.white && turn.black) {
        rows.push({
          id: `${moveNumber}-w`,
          moveNumber,
          white: turn.white,
          showBlackEllipsis: true,
        });
        rows.push({
          id: `${moveNumber}-b`,
          moveNumber,
          black: turn.black,
          showWhiteEllipsis: true,
        });
      } else {
        rows.push({
          id: `${moveNumber}-full`,
          moveNumber,
          white: turn.white,
          black: turn.black,
        });
      }
    });

    return rows;
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

  isSubvariationActive = computed(() => {
    const fen = this.currentFen();
    const tree = this.effectiveTree();
    const ply = this.currentPly();
    const initialPly = this.initialPly();
    
    if (ply <= initialPly || tree.length === 0) return false;
    
    return !tree.some(n => n.fen === fen);
  });

  activeContinuationLine = computed(() => {
    if (!this.isSubvariationActive()) return [];

    const fen = this.currentFen();
    const tree = this.effectiveTree();
    
    return this.findContinuationPathRecursive(tree, fen);
  });

  activeContinuationSet = computed(() => {
    const line = this.activeContinuationLine();
    const set = new Set<string>();
    line.forEach(n => set.add(`${n.fen}_${n.ply}`));
    return set;
  });

  private findContinuationPathRecursive(nodes: MoveNode[], activeFen: string): MoveNode[] {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.fen === activeFen) {
        return nodes; // Return the entire branch array so that the whole variation remains highlighted
      }
      
      if (node.variations) {
        for (const variation of node.variations) {
          const res = this.findContinuationPathRecursive(variation, activeFen);
          if (res.length > 0 || variation.some(n => n.fen === activeFen)) {
            return res.length > 0 ? res : variation;
          }
        }
      }
    }
    return [];
  }

  isLastMove = computed(() => this.nextOptions().length === 0);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.enableKeyboardNavigation()) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    const options = this.nextOptions();
    const hasMultiple = options.length > 1;

    switch (event.key) {
      case 'ArrowLeft':
        if (event.shiftKey) return;
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
        if (event.shiftKey) return;
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

  onContextMenu(event: MouseEvent, node: MoveNode, isMainline: boolean) {
    event.preventDefault();
    this.contextMenuNode.set(node);
    this.contextMenuPos.set({ x: event.clientX, y: event.clientY });
    this.isContextMenuNodeMainline.set(isMainline);
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

  onPromoteToMainline() {
    const node = this.contextMenuNode();
    if (node) {
      this.promoteToMainline.emit(node);
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
