/**
 * @file mandalart.model.ts
 * @description Data contracts and coordinate mapping helpers for the 9x9 Mandalart Goal Matrix.
 * 
 * ARCHITECTURAL DESIGN:
 * The 9x9 matrix comprises 9 interconnected 3x3 blocks (indices 0 to 8).
 * Block 4 is the Center Core Block:
 *  - Cell 4 (center) = Ultimate Core Goal.
 *  - Cells 0,1,2,3, 5,6,7,8 = The 8 Foundational Pillars.
 * 
 * Outer Blocks (0,1,2,3, 5,6,7,8) each correspond to a Pillar:
 *  - Cell 4 (center of outer block) = Mirrored Pillar Title.
 *  - Cells 0,1,2,3, 5,6,7,8 = The 8 Actionable Tasks for that Pillar.
 */

export interface MandalartAction {
  id: string;
  title: string;
  completed: boolean;
  notes?: string;
}

export interface MandalartPillar {
  id: string;
  index: number; // 0 to 7
  title: string;
  tagline?: string;
  colorTheme?: string;
  actions: MandalartAction[]; // Exactly 8 actions
}

export interface MandalartBoard {
  id: string;
  version: number;
  coreGoal: string;
  subtitle?: string;
  category?: string;
  pillars: MandalartPillar[]; // Exactly 8 pillars
  updatedAt: string;
}

export interface MandalartTemplate {
  id: string;
  name: string;
  description: string;
  badge?: string;
  icon?: string;
  data: MandalartBoard;
}

/**
 * Mapping helpers between Block Index (0..8) and Pillar Index (0..7).
 * Block 4 is the Center Core Block.
 */
export function blockIndexToPillarIndex(blockIndex: number): number | null {
  if (blockIndex === 4) return null;
  return blockIndex < 4 ? blockIndex : blockIndex - 1;
}

export function pillarIndexToBlockIndex(pillarIndex: number): number {
  if (pillarIndex < 4) return pillarIndex;
  return pillarIndex + 1;
}

/**
 * Cell index within an outer block to Action index (0..7).
 * Cell 4 is the center pillar title.
 */
export function cellIndexToActionIndex(cellIndex: number): number | null {
  if (cellIndex === 4) return null;
  return cellIndex < 4 ? cellIndex : cellIndex - 1;
}

export function actionIndexToCellIndex(actionIndex: number): number {
  if (actionIndex < 4) return actionIndex;
  return actionIndex + 1;
}

/**
 * Center block cell index (0..8) to Pillar index (0..7).
 * Cell 4 is the ultimate core goal.
 */
export function centerCellIndexToPillarIndex(cellIndex: number): number | null {
  if (cellIndex === 4) return null;
  return cellIndex < 4 ? cellIndex : cellIndex - 1;
}

/**
 * Computes global 9x9 row and column from block index (0..8) and cell index (0..8).
 */
export function getGlobalCoordinates(blockIndex: number, cellIndex: number): { row: number; col: number } {
  const blockRow = Math.floor(blockIndex / 3);
  const blockCol = blockIndex % 3;
  const cellRow = Math.floor(cellIndex / 3);
  const cellCol = cellIndex % 3;

  return {
    row: blockRow * 3 + cellRow,
    col: blockCol * 3 + cellCol,
  };
}
