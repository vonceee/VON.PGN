import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/ui';
import { Chess } from 'chess.js';
import { MoveNode } from '../../../../core/models/study.model';

@Component({
  selector: 'app-move-notation',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="move-notation-container overflow-hidden flex flex-col h-full bg-slate-900/50">
      <!-- Navigation controls -->
      @if (showNavigation()) {
        <div class="flex-none flex items-center justify-center gap-1 p-2 border-b border-border-theme bg-slate-800/40">
          <app-button variant="outline" size="sm" (click)="navigate.emit(0)" [disabled]="currentPly() === 0">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
            </svg>
          </app-button>
          <app-button variant="outline" size="sm" (click)="navigate.emit(currentPly() - 1)" [disabled]="currentPly() === 0">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </app-button>
          <app-button variant="outline" size="sm" (click)="navigate.emit(currentPly() + 1)" [disabled]="isLastMove()">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </app-button>
        </div>
      }

      <!-- Scrollable Move List -->
      <div #scrollContainer class="flex-1 overflow-y-auto custom-scrollbar p-4 text-sm leading-relaxed">
        <div class="move-tree-render">
          <ng-container *ngTemplateOutlet="renderNodes; context: { nodes: effectiveTree(), isMainline: true }"></ng-container>
        </div>

        @if (effectiveTree().length === 0) {
          <div class="h-full flex flex-col items-center justify-center opacity-40 py-10">
            <p class="text-xs uppercase font-black tracking-widest">No moves</p>
          </div>
        }
      </div>

      <!-- Recursive Template for Moves -->
      <ng-template #renderNodes let-nodes="nodes" let-isMainline="isMainline">
        @for (node of nodes; track node.fen) {
          <span class="inline-flex items-center">
            <!-- Move Number -->
            @if (node.ply % 2 !== 0) {
              <span class="text-slate-500 font-bold mr-1.5 ml-1 select-none text-[10px]">{{ (node.ply + 1) / 2 }}.</span>
            } @else if ($first && !isMainline) {
               <span class="text-slate-500 font-bold mr-1.5 ml-1 select-none text-[10px]">{{ node.ply / 2 }}...</span>
            }

            <!-- Move -->
            <button
              (click)="onMoveClick(node)"
              [class.active-move]="currentFen() === node.fen || currentPly() === node.ply"
              class="move-text px-1.5 py-0.5 rounded transition-all hover:bg-cyan-400/20"
            >
              {{ node.san }}
            </button>

            <!-- Recursive Variations -->
            @if (node.variations && node.variations.length > 0) {
              <span class="variations-container text-slate-400 italic text-[0.95em]">
                @for (variation of node.variations; track $index) {
                  <span class="variation-bracket mx-1 whitespace-nowrap">
                    ( <ng-container *ngTemplateOutlet="renderNodes; context: { nodes: variation, isMainline: false }"></ng-container> ) 
                  </span>
                }
              </span>
            }
          </span>
        }
      </ng-template>
    </div>
  `,
  styles: [
    `
      .move-text {
        color: #e2e8f0;
        font-weight: 500;
        cursor: pointer;
      }
      .active-move {
        background-color: rgba(34, 211, 238, 0.25);
        color: #22d3ee;
        font-weight: 700;
        box-shadow: 0 0 10px rgba(34, 211, 238, 0.1);
      }
      .variations-container {
        display: inline;
        color: #94a3b8;
      }
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
    `,
  ],
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
        // Fallback for cases where chess.js might fail (invalid move logs)
        list.push({ san, uci: '', fen: '', ply: index + 1, variations: [] });
      }
    });
    return list;
  }

  isLastMove(): boolean {
    const tree = this.effectiveTree();
    return this.currentPly() >= tree.length;
  }

  onMoveClick(node: MoveNode) {
    this.nodeClicked.emit(node);
    this.moveClicked.emit(node.ply);
  }
}
