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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/ui';
import { MoveNode } from '../../../../core/models/study.model';
import { buildTreeFromMoves } from '../../../../core/utils/chess-tree.utils';

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
  // Advanced Move Tree (Used by Study)
  moveTree = input<MoveNode[]>([]);
  // Legacy Flat Moves (Used by everything else)
  moves = input<string[]>([]);

  currentFen = input<string>('');
  currentPly = input<number>(0);
  showNavigation = input<boolean>(false);

  // Outputs
  navigate = output<number>();
  nodeClicked = output<MoveNode>();
  deleteFromHere = output<MoveNode>();

  // Context Menu State
  contextMenuNode = signal<MoveNode | null>(null);
  contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  scrollContainer = viewChild<ElementRef>('scrollContainer');

  constructor() {
    effect(() => {
      // Trigger scroll when currentFen changes
      this.currentFen();
      
      // Use requestAnimationFrame to wait for the DOM to update the .active-move class
      requestAnimationFrame(() => {
        this.scrollToActiveMove();
      });
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

  isLastMove = computed(() => {
    const tree = this.effectiveTree();
    return this.currentPly() >= tree.length;
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.showNavigation()) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (this.currentPly() > 0) this.navigate.emit(this.currentPly() - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (!this.isLastMove()) this.navigate.emit(this.currentPly() + 1);
        break;
      case 'ArrowUp':
      case 'Home':
        event.preventDefault();
        this.navigate.emit(0);
        break;
      case 'ArrowDown':
      case 'End':
        event.preventDefault();
        this.navigate.emit(this.effectiveTree().length);
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

  onMoveClick(node: MoveNode) {
    this.navigate.emit(node.ply);
    this.nodeClicked.emit(node);
  }
}
