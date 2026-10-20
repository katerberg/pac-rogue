import type { LearnColumn } from "./learnUpgradeColumns";

/** Top of the clipped upgrade list (matches prior fixed layout start). */
export const LEARN_UPGRADE_CLIP_TOP = 100;
/** Bottom of the clip — clears the BACK label at y=550. */
export const LEARN_UPGRADE_CLIP_BOTTOM = 530;
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

/** Vertical span of a school column using the LearnScene layout recurrence. */
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

/** Positive deltaY (wheel down) increases offset so content moves up. */
export function applyLearnUpgradeWheel(offset: number, deltaY: number, extent: number): number {
  return clampLearnUpgradeScroll(offset + deltaY, extent);
}

export function learnUpgradeColumnAtX(
  worldX: number,
  columnX: Readonly<Record<LearnColumn, number>> = LEARN_UPGRADE_COLUMN_X,
  rowWidth: number = LEARN_UPGRADE_ROW_WIDTH,
): LearnColumn | null {
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
