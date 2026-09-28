/**
 * @file mandalart.component.ts
 * @description 9x9 Mandalart Goal Matrix Component for VON.CHESS.
 *
 * ARCHITECTURAL COMPLIANCE:
 * - Signal-First Angular 18+ architecture with OnPush change detection.
 * - Adheres strictly to VON.CHESS 3-column bleeding layout with gutter rails.
 * - Bidirectional synchronization between Center Block pillars and Outer Block centers.
 */

import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';
import {
  MandalartService,
  PillarProgress,
} from './services/mandalart.service';
import {
  MandalartBoard,
  MandalartPillar,
  blockIndexToPillarIndex,
  pillarIndexToBlockIndex,
} from './models/mandalart.model';

export interface GridCellRenderData {
  type: 'core' | 'pillar' | 'action';
  title: string;
  completed?: boolean;
  pillarIndex?: number;
  actionIndex?: number;
  cellIndex: number;
  directionIcon?: string;
}

export interface GridBlockRenderData {
  blockIndex: number;
  isCenterBlock: boolean;
  pillarIndex: number | null;
  pillar: MandalartPillar | null;
  title: string;
  progress: PillarProgress | null;
  cells: GridCellRenderData[];
}

@Component({
  selector: 'app-mandalart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FloatingCursorContainerDirective,
    FloatingCursorComponent,
  ],
  templateUrl: './mandalart.component.html',
  styleUrls: ['./mandalart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MandalartComponent {
  readonly service = inject(MandalartService);

  // Core signals from service
  readonly board = this.service.board;
  readonly activeTemplateId = this.service.activeTemplateId;
  readonly templates = this.service.templates;
  readonly focusedBlockIndex = this.service.focusedBlockIndex;
  readonly completedCount = this.service.completedActionsCount;
  readonly totalCount = this.service.totalActionsCount;
  readonly overallPercentage = this.service.overallPercentage;
  readonly pillarProgressList = this.service.pillarProgressList;
  readonly filterQuery = this.service.filterQuery;

  // Local editing modal state
  readonly isEditing = signal<boolean>(false);
  readonly editType = signal<'core' | 'pillar' | 'action'>('core');
  readonly editPillarIndex = signal<number>(0);
  readonly editActionIndex = signal<number>(0);
  readonly editModalTitle = signal<string>('');
  readonly editModalSubtitle = signal<string>('');
  readonly editValue = signal<string>('');

  // Modals & Panels
  readonly showImportModal = signal<boolean>(false);
  readonly showGuideModal = signal<boolean>(false);
  readonly importText = signal<string>('');
  readonly importFeedback = signal<{ success: boolean; message: string } | null>(null);

  /**
   * Computed list of all 9 blocks (0 to 8) pre-mapped for rapid template rendering.
   */
  readonly blocks = computed<GridBlockRenderData[]>(() => {
    const currentBoard = this.board();
    const progressMap = new Map<number, PillarProgress>();
    for (const prog of this.pillarProgressList()) {
      progressMap.set(prog.pillarIndex, prog);
    }

    const result: GridBlockRenderData[] = [];

    for (let b = 0; b < 9; b++) {
      if (b === 4) {
        // Center Core Block
        const cells: GridCellRenderData[] = [
          // Cell 0: Pillar 0 (Top-Left)
          {
            type: 'pillar',
            title: currentBoard.pillars[0]?.title ?? 'Pillar 1',
            pillarIndex: 0,
            cellIndex: 0,
            directionIcon: '↖',
          },
          // Cell 1: Pillar 1 (Top-Center)
          {
            type: 'pillar',
            title: currentBoard.pillars[1]?.title ?? 'Pillar 2',
            pillarIndex: 1,
            cellIndex: 1,
            directionIcon: '↑',
          },
          // Cell 2: Pillar 2 (Top-Right)
          {
            type: 'pillar',
            title: currentBoard.pillars[2]?.title ?? 'Pillar 3',
            pillarIndex: 2,
            cellIndex: 2,
            directionIcon: '↗',
          },
          // Cell 3: Pillar 3 (Mid-Left)
          {
            type: 'pillar',
            title: currentBoard.pillars[3]?.title ?? 'Pillar 4',
            pillarIndex: 3,
            cellIndex: 3,
            directionIcon: '←',
          },
          // Cell 4: Ultimate Core Goal (Center)
          {
            type: 'core',
            title: currentBoard.coreGoal,
            cellIndex: 4,
          },
          // Cell 5: Pillar 4 (Mid-Right)
          {
            type: 'pillar',
            title: currentBoard.pillars[4]?.title ?? 'Pillar 5',
            pillarIndex: 4,
            cellIndex: 5,
            directionIcon: '→',
          },
          // Cell 6: Pillar 5 (Bottom-Left)
          {
            type: 'pillar',
            title: currentBoard.pillars[5]?.title ?? 'Pillar 6',
            pillarIndex: 5,
            cellIndex: 6,
            directionIcon: '↙',
          },
          // Cell 7: Pillar 6 (Bottom-Center)
          {
            type: 'pillar',
            title: currentBoard.pillars[6]?.title ?? 'Pillar 7',
            pillarIndex: 6,
            cellIndex: 7,
            directionIcon: '↓',
          },
          // Cell 8: Pillar 7 (Bottom-Right)
          {
            type: 'pillar',
            title: currentBoard.pillars[7]?.title ?? 'Pillar 8',
            pillarIndex: 7,
            cellIndex: 8,
            directionIcon: '↘',
          },
        ];

        result.push({
          blockIndex: b,
          isCenterBlock: true,
          pillarIndex: null,
          pillar: null,
          title: 'The Core Goal & 8 Pillars',
          progress: null,
          cells,
        });
      } else {
        // Outer Block
        const pIndex = blockIndexToPillarIndex(b)!;
        const pillar = currentBoard.pillars[pIndex];
        const prog = progressMap.get(pIndex) ?? null;

        const cells: GridCellRenderData[] = [];
        for (let c = 0; c < 9; c++) {
          if (c === 4) {
            // Center cell of outer block = Mirrored Pillar Title
            cells.push({
              type: 'pillar',
              title: pillar?.title ?? `Pillar ${pIndex + 1}`,
              pillarIndex: pIndex,
              cellIndex: 4,
            });
          } else {
            // Action cells: 0..3 map to action 0..3; 5..8 map to action 4..7
            const aIndex = c < 4 ? c : c - 1;
            const action = pillar?.actions[aIndex];
            cells.push({
              type: 'action',
              title: action?.title ?? `Action ${aIndex + 1}`,
              completed: action?.completed ?? false,
              pillarIndex: pIndex,
              actionIndex: aIndex,
              cellIndex: c,
            });
          }
        }

        result.push({
          blockIndex: b,
          isCenterBlock: false,
          pillarIndex: pIndex,
          pillar,
          title: pillar?.title ?? `Pillar ${pIndex + 1}`,
          progress: prog,
          cells,
        });
      }
    }

    return result;
  });

  /**
   * Block data for current Focus Mode (if active).
   */
  readonly focusedBlockData = computed<GridBlockRenderData | null>(() => {
    const idx = this.focusedBlockIndex();
    if (idx === null) return null;
    return this.blocks()[idx] ?? null;
  });

  // ==========================================
  // VIEW INTERACTIONS
  // ==========================================

  setFocusBlock(blockIndex: number | null): void {
    this.service.setFocusedBlock(blockIndex);
  }

  nextFocusBlock(): void {
    this.service.nextFocusedBlock();
  }

  prevFocusBlock(): void {
    this.service.prevFocusedBlock();
  }

  toggleAction(pillarIndex: number, actionIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.service.toggleAction(pillarIndex, actionIndex);
  }

  markAllInPillar(pillarIndex: number, completed: boolean): void {
    this.service.setAllActionsInPillar(pillarIndex, completed);
  }

  // ==========================================
  // EDITING MODAL ACTIONS
  // ==========================================

  openEditCore(): void {
    this.editType.set('core');
    this.editValue.set(this.board().coreGoal);
    this.editModalTitle.set('Edit Ultimate Core Goal');
    this.editModalSubtitle.set('This is the central destination of your 81-square matrix (Row 5, Col 5).');
    this.isEditing.set(true);
  }

  openEditPillar(pillarIndex: number): void {
    const pillar = this.board().pillars[pillarIndex];
    if (!pillar) return;

    this.editType.set('pillar');
    this.editPillarIndex.set(pillarIndex);
    this.editValue.set(pillar.title);
    this.editModalTitle.set(`Edit Pillar ${pillarIndex + 1}: ${pillar.title}`);
    this.editModalSubtitle.set(
      'Updating this title updates both the Core Block square and the Outer Block center in real time.'
    );
    this.isEditing.set(true);
  }

  openEditAction(pillarIndex: number, actionIndex: number): void {
    const pillar = this.board().pillars[pillarIndex];
    const action = pillar?.actions[actionIndex];
    if (!action) return;

    this.editType.set('action');
    this.editPillarIndex.set(pillarIndex);
    this.editActionIndex.set(actionIndex);
    this.editValue.set(action.title);
    this.editModalTitle.set(`Edit Task in "${pillar.title}"`);
    this.editModalSubtitle.set(`Action ${actionIndex + 1} of 8 for this pillar.`);
    this.isEditing.set(true);
  }

  handleCellClick(cell: GridCellRenderData): void {
    if (cell.type === 'core') {
      this.openEditCore();
    } else if (cell.type === 'pillar' && cell.pillarIndex !== undefined) {
      this.openEditPillar(cell.pillarIndex);
    } else if (
      cell.type === 'action' &&
      cell.pillarIndex !== undefined &&
      cell.actionIndex !== undefined
    ) {
      this.openEditAction(cell.pillarIndex, cell.actionIndex);
    }
  }

  saveEdit(): void {
    const val = this.editValue().trim();
    if (!val) {
      this.cancelEdit();
      return;
    }

    const type = this.editType();
    if (type === 'core') {
      this.service.updateCoreGoal(val);
    } else if (type === 'pillar') {
      this.service.updatePillarTitle(this.editPillarIndex(), val);
    } else if (type === 'action') {
      this.service.updateActionTitle(this.editPillarIndex(), this.editActionIndex(), val);
    }

    this.isEditing.set(false);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  // ==========================================
  // TEMPLATES & EXPORT / IMPORT
  // ==========================================

  onTemplateChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.service.loadTemplate(target.value);
    }
  }

  resetCurrentTemplate(): void {
    if (confirm('Reset matrix to the default values of this template? Any custom edits will be reverted.')) {
      this.service.resetToTemplateDefault();
    }
  }

  printMatrix(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  exportJson(): void {
    this.service.exportJson();
  }

  openImportModal(): void {
    this.importText.set('');
    this.importFeedback.set(null);
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  executeImport(): void {
    const text = this.importText().trim();
    if (!text) {
      this.importFeedback.set({ success: false, message: 'Please paste valid JSON text.' });
      return;
    }

    const res = this.service.importJson(text);
    this.importFeedback.set(res);
    if (res.success) {
      setTimeout(() => {
        this.closeImportModal();
      }, 900);
    }
  }

  openGuide(): void {
    this.showGuideModal.set(true);
  }

  closeGuide(): void {
    this.showGuideModal.set(false);
  }

  matchesSearch(text: string): boolean {
    const query = this.filterQuery();
    if (!query) return true;
    return text.toLowerCase().includes(query);
  }
}
