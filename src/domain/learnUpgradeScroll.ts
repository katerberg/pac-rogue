import type { LearnColumn } from "./learnUpgradeColumns";

export const LEARN_UPGRADE_CLIP_TOP = 66;
export const LEARN_UPGRADE_CLIP_BOTTOM = 558;
export const LEARN_UPGRADE_ROW_GAP = 16;
export const LEARN_UPGRADE_HEADER_GAP = 20;
export const LEARN_UPGRADE_COLUMN_X = { left: 20, right: 596 } as const;
export const LEARN_UPGRADE_ROW_WIDTH = 190;

export function learnUpgradeViewportHeight(
  clipTop: number = LEARN_UPGRADE_CLIP_TOP,
  clipBottom: number = LEARN_UPGRADE_CLIP_BOTTOM,
): number {
  return Math.max(0, clipBottom - clipTop);
}

export function learnUpgradeContentHeight(
  schoolCount: number,
  upgradeCount: number,
  rowGap: number = LEARN_UPGRADE_ROW_GAP,
  headerGap: number = LEARN_UPGRADE_HEADER_GAP,
): number {
  const schools = Math.max(0, schoolCount);
  const upgrades = Math.max(0, upgradeCount);
  return schools * headerGap + upgrades * rowGap;
}

export function learnUpgradeScrollExtent(
  contentHeight: number,
  viewportHeight: number = learnUpgradeViewportHeight(),
): number {
  return Math.max(0, contentHeight - Math.max(0, viewportHeight));
}

export function clampLearnUpgradeScroll(offset: number, extent: number): number {
  if (!(extent > 0)) {
    return 0;
  }
  if (!(offset > 0)) {
    return 0;
  }
  return offset > extent ? extent : offset;
}

export function applyLearnUpgradeWheel(offset: number, deltaY: number, extent: number): number {
  return clampLearnUpgradeScroll(offset + deltaY, extent);
}

export function learnUpgradeColumnAt(
  worldX: number,
  worldY: number,
  columnX: Readonly<Record<LearnColumn, number>> = LEARN_UPGRADE_COLUMN_X,
  rowWidth: number = LEARN_UPGRADE_ROW_WIDTH,
  clipTop: number = LEARN_UPGRADE_CLIP_TOP,
  clipBottom: number = LEARN_UPGRADE_CLIP_BOTTOM,
): LearnColumn | null {
  if (worldY < clipTop || worldY >= clipBottom) {
    return null;
  }
  for (const column of ["left", "right"] as const) {
    const x = columnX[column];
    if (worldX >= x && worldX < x + rowWidth) {
      return column;
    }
  }
  return null;
}

export function learnUpgradeRowVisible(
  localY: number,
  scrollOffset: number,
  clipTop: number = LEARN_UPGRADE_CLIP_TOP,
  clipBottom: number = LEARN_UPGRADE_CLIP_BOTTOM,
  rowHalf: number = LEARN_UPGRADE_ROW_GAP / 2,
): boolean {
  const worldY = localY - scrollOffset;
  return worldY + rowHalf > clipTop && worldY - rowHalf < clipBottom;
}
