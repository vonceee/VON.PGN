import {
  Component,
  input,
  output,
  computed,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/ui';
import { Chess } from 'chess.js';
import { MoveNode } from '../../../../core/models/study.model';

@Component({
  selector: 'app-move-notation',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './move-notation.component.html',
  styleUrls: ['./move-notation.component.css'],
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
  moveClicked = output<number>(); // Legacy output

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Automatically determine which data source to use
  effectiveTree = computed(() => {
    const tree = this.moveTree();
    if (tree && tree.length > 0) return tree;

    const flatMoves = this.moves();
    if (flatMoves && flatMoves.length > 0) {
      return this.buildFlatTree(flatMoves);
    }
    return [];
  });

  private buildFlatTree(moves: string[]): MoveNode[] {
    const list: MoveNode[] = [];
    const chess = new Chess();
    moves.forEach((san, index) => {
      try {
        const m = chess.move(san);
        if (m) {
          list.push({
            san: m.san,
            uci: m.from + m.to,
            fen: chess.fen(),
            ply: index + 1,
            variations: [],
          });
        }
      } catch (e) {
        list.push({ san, uci: '', fen: '', ply: index + 1, variations: [] });
      }
    });
    return list;
  }

  isLastMove(): boolean {
    const tree = this.effectiveTree();
    return this.currentPly() >= tree.length;
  }

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

  onMoveClick(node: MoveNode) {
    this.navigate.emit(node.ply); 
    this.nodeClicked.emit(node);
    this.moveClicked.emit(node.ply);
  }
}
