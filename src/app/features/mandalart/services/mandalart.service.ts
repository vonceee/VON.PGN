/**
 * @file mandalart.service.ts
 * @description State management and local persistence service for the 9x9 Mandalart Goal Matrix.
 * 
 * ARCHITECTURAL STANDARDS:
 * - Signal-First state management (signal, computed, effect).
 * - Local-first persistence via window.localStorage.
 * - Bidirectional synchronization between Core Block pillars and Outer Block centers.
 */

import { Injectable, signal, computed, effect } from '@angular/core';
import {
  MandalartBoard,
  MandalartTemplate,
  blockIndexToPillarIndex,
  pillarIndexToBlockIndex,
} from '../models/mandalart.model';
import { MANDALART_TEMPLATES } from '../data/mandalart-templates';

const STORAGE_KEY = 'vonchess_mandalart_active_v1';
const TEMPLATE_KEY = 'vonchess_mandalart_selected_template';

export interface PillarProgress {
  pillarIndex: number;
  title: string;
  completed: number;
  total: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root',
})
export class MandalartService {
  /** Available templates */
  readonly templates: MandalartTemplate[] = MANDALART_TEMPLATES;

  /** Active template identifier */
  readonly activeTemplateId = signal<string>(this.getInitialTemplateId());

  /** The core reactive board state */
  readonly board = signal<MandalartBoard>(this.getInitialBoard());

  /**
   * Block index currently highlighted or zoomed in Focus Mode.
   * Null represents the full 9x9 overview mode.
   * 0..8 represents the focused 3x3 block (4 is Center Core block).
   */
  readonly focusedBlockIndex = signal<number | null>(null);

  /** Search query filter for highlighting matching cells */
  readonly filterQuery = signal<string>('');

  /** Derived count of completed actionable tasks out of 64 */
  readonly completedActionsCount = computed(() => {
    const current = this.board();
    let count = 0;
    for (const pillar of current.pillars) {
      for (const action of pillar.actions) {
        if (action.completed) {
          count++;
        }
      }
    }
    return count;
  });

  /** Total actionable tasks (always 8 pillars * 8 actions = 64) */
  readonly totalActionsCount = computed(() => 64);

  /** Overall completion percentage (0 - 100) */
  readonly overallPercentage = computed(() => {
    const total = this.totalActionsCount();
    if (total === 0) return 0;
    return Math.round((this.completedActionsCount() / total) * 100);
  });

  /** Per-pillar completion statistics */
  readonly pillarProgressList = computed<PillarProgress[]>(() => {
    const current = this.board();
    return current.pillars.map((pillar) => {
      const completed = pillar.actions.filter((a) => a.completed).length;
      const total = pillar.actions.length;
      return {
        pillarIndex: pillar.index,
        title: pillar.title,
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  });

  constructor() {
    // Auto-persist board changes to localStorage
    effect(() => {
      const b = this.board();
      this.saveToStorage(b);
    });
  }

  // ==========================================
  // CORE EDITING ACTIONS
  // ==========================================

  /**
   * Updates the central ultimate core goal text.
   */
  updateCoreGoal(newGoal: string): void {
    const trimmed = newGoal.trim();
    if (!trimmed) return;
    this.board.update((current) => ({
      ...current,
      coreGoal: trimmed,
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Updates the subtitle / tagline for the board.
   */
  updateSubtitle(subtitle: string): void {
    this.board.update((current) => ({
      ...current,
      subtitle: subtitle.trim(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Updates a pillar's title.
   * NOTE: This automatically updates both the center block's surrounding cell and
   * the outer block's center cell, guaranteeing 100% bidirectional sync!
   */
  updatePillarTitle(pillarIndex: number, newTitle: string): void {
    const trimmed = newTitle.trim();
    if (!trimmed || pillarIndex < 0 || pillarIndex > 7) return;

    this.board.update((current) => {
      const updatedPillars = current.pillars.map((p) => {
        if (p.index === pillarIndex) {
          return { ...p, title: trimmed };
        }
        return p;
      });
      return {
        ...current,
        pillars: updatedPillars,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Updates an action title.
   */
  updateActionTitle(pillarIndex: number, actionIndex: number, newTitle: string): void {
    const trimmed = newTitle.trim();
    if (!trimmed || pillarIndex < 0 || pillarIndex > 7 || actionIndex < 0 || actionIndex > 7) return;

    this.board.update((current) => {
      const updatedPillars = current.pillars.map((p) => {
        if (p.index !== pillarIndex) return p;

        const updatedActions = p.actions.map((act, idx) => {
          if (idx !== actionIndex) return act;
          return { ...act, title: trimmed };
        });

        return { ...p, actions: updatedActions };
      });

      return {
        ...current,
        pillars: updatedPillars,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Toggles the completion checkbox for a given action.
   */
  toggleAction(pillarIndex: number, actionIndex: number): void {
    if (pillarIndex < 0 || pillarIndex > 7 || actionIndex < 0 || actionIndex > 7) return;

    this.board.update((current) => {
      const updatedPillars = current.pillars.map((p) => {
        if (p.index !== pillarIndex) return p;

        const updatedActions = p.actions.map((act, idx) => {
          if (idx !== actionIndex) return act;
          return { ...act, completed: !act.completed };
        });

        return { ...p, actions: updatedActions };
      });

      return {
        ...current,
        pillars: updatedPillars,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Marks all actions in a pillar as completed or incomplete.
   */
  setAllActionsInPillar(pillarIndex: number, completed: boolean): void {
    if (pillarIndex < 0 || pillarIndex > 7) return;

    this.board.update((current) => {
      const updatedPillars = current.pillars.map((p) => {
        if (p.index !== pillarIndex) return p;
        return {
          ...p,
          actions: p.actions.map((act) => ({ ...act, completed })),
        };
      });

      return {
        ...current,
        pillars: updatedPillars,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  // ==========================================
  // VIEW & FOCUS CONTROLS
  // ==========================================

  setFocusedBlock(blockIndex: number | null): void {
    this.focusedBlockIndex.set(blockIndex);
  }

  nextFocusedBlock(): void {
    const cur = this.focusedBlockIndex();
    if (cur === null) {
      this.focusedBlockIndex.set(0);
      return;
    }
    this.focusedBlockIndex.set((cur + 1) % 9);
  }

  prevFocusedBlock(): void {
    const cur = this.focusedBlockIndex();
    if (cur === null) {
      this.focusedBlockIndex.set(8);
      return;
    }
    this.focusedBlockIndex.set((cur - 1 + 9) % 9);
  }

  setFilterQuery(query: string): void {
    this.filterQuery.set(query.toLowerCase().trim());
  }

  // ==========================================
  // TEMPLATES & IMPORT / EXPORT
  // ==========================================

  /**
   * Loads a chosen curated template.
   */
  loadTemplate(templateId: string): void {
    const found = this.templates.find((t) => t.id === templateId);
    if (!found) return;

    // Deep clone to avoid mutating reference template
    const cloned: MandalartBoard = JSON.parse(JSON.stringify(found.data));
    cloned.updatedAt = new Date().toISOString();

    this.activeTemplateId.set(templateId);
    this.board.set(cloned);
    this.focusedBlockIndex.set(null);

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TEMPLATE_KEY, templateId);
    }
  }

  /**
   * Resets the current board back to the pristine state of its active template.
   */
  resetToTemplateDefault(): void {
    const templateId = this.activeTemplateId();
    this.loadTemplate(templateId);
  }

  /**
   * Exports the board as a downloadable JSON file.
   */
  exportJson(): void {
    if (typeof window === 'undefined') return;

    const data = JSON.stringify(this.board(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `vonchess-mandalart-${new Date().toISOString().slice(0, 10)}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports a board configuration from a user JSON string.
   */
  importJson(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString) as MandalartBoard;

      // Basic validation
      if (!parsed.coreGoal || !Array.isArray(parsed.pillars) || parsed.pillars.length !== 8) {
        return {
          success: false,
          message: 'Invalid Mandalart format: must contain a coreGoal and exactly 8 pillars.',
        };
      }

      for (let i = 0; i < 8; i++) {
        const pillar = parsed.pillars[i];
        if (!pillar.title || !Array.isArray(pillar.actions) || pillar.actions.length !== 8) {
          return {
            success: false,
            message: `Invalid pillar at index ${i}: each pillar must have a title and exactly 8 actions.`,
          };
        }
      }

      parsed.updatedAt = new Date().toISOString();
      this.board.set(parsed);
      this.activeTemplateId.set('custom');
      return { success: true, message: 'Mandalart matrix loaded successfully!' };
    } catch (e: any) {
      return {
        success: false,
        message: 'Could not parse JSON file: ' + (e?.message || 'Syntax error'),
      };
    }
  }

  // ==========================================
  // STORAGE HELPERS
  // ==========================================

  private getInitialTemplateId(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(TEMPLATE_KEY);
      if (saved && this.templates.some((t) => t.id === saved)) {
        return saved;
      }
    }
    return 'road-to-2000';
  }

  private getInitialBoard(): MandalartBoard {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.coreGoal && parsed.pillars?.length === 8) {
            return parsed;
          }
        } catch {
          // Fall back to default
        }
      }
    }

    const defaultTpl = this.templates.find((t) => t.id === 'road-to-2000');
    return JSON.parse(JSON.stringify(defaultTpl!.data));
  }

  private saveToStorage(board: MandalartBoard): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
      } catch (e) {
        console.warn('[MandalartService] Failed to save state to localStorage:', e);
      }
    }
  }
}
