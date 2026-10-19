import { QUARTER_HUD_LEFT, quarterHudIconPosition } from "./moneyTalks";
import type { Point } from "./moneyTalks";

export const UPGRADE_HUD_COLUMNS = 3;
export const UPGRADE_HUD_COMPACT_SIZE = 16;
const UPGRADE_HUD_GAP = 4;
const UPGRADE_HUD_TOP_GAP = 8;
const UPGRADE_HUD_RIGHT_PAD = 8;

export function upgradeHudIconSize(gutterRight: number): number {
  const span = gutterRight - QUARTER_HUD_LEFT - UPGRADE_HUD_RIGHT_PAD;
  return Math.max(
    UPGRADE_HUD_COMPACT_SIZE,
    Math.floor((span - (UPGRADE_HUD_COLUMNS - 1) * UPGRADE_HUD_GAP) / UPGRADE_HUD_COLUMNS),
  );
}

export function upgradeHudIconPosition(
  index: number,
  size: number,
  quarterSize: number,
  left: number = QUARTER_HUD_LEFT,
): Point {
  const col = index % UPGRADE_HUD_COLUMNS;
  const row = Math.floor(index / UPGRADE_HUD_COLUMNS);
  const pitch = size + UPGRADE_HUD_GAP;
  const quarterBottom = quarterHudIconPosition(0, quarterSize).y + quarterSize / 2;
  return {
    x: left + size / 2 + col * pitch,
    y: quarterBottom + UPGRADE_HUD_TOP_GAP + size / 2 + row * pitch,
  };
}
