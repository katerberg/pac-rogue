import { QUARTER_HUD_LEFT, quarterHudIconPosition } from "./moneyTalks";
import type { Point } from "./moneyTalks";

export const UPGRADE_HUD_COLUMNS = 3;
export const UPGRADE_HUD_ICON_SIZE = 16;
const UPGRADE_HUD_GAP = 4;
const UPGRADE_HUD_TOP_GAP = 8;

/** Row-major grid under the quarters row; `left` is the grid's left edge. */
export function upgradeHudIconPosition(
  index: number,
  quarterSize: number,
  left: number = QUARTER_HUD_LEFT,
): Point {
  const col = index % UPGRADE_HUD_COLUMNS;
  const row = Math.floor(index / UPGRADE_HUD_COLUMNS);
  const pitch = UPGRADE_HUD_ICON_SIZE + UPGRADE_HUD_GAP;
  const quarterBottom = quarterHudIconPosition(0, quarterSize).y + quarterSize / 2;
  return {
    x: left + UPGRADE_HUD_ICON_SIZE / 2 + col * pitch,
    y: quarterBottom + UPGRADE_HUD_TOP_GAP + UPGRADE_HUD_ICON_SIZE / 2 + row * pitch,
  };
}
