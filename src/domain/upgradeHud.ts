import { QUARTER_HUD_LEFT, quarterHudIconPosition } from "./moneyTalks";
import type { Point } from "./moneyTalks";

export const UPGRADE_HUD_COLUMNS = 3;
export const UPGRADE_HUD_COMPACT_SIZE = 16;
export const UPGRADE_HUD_HOVER_SCALE = 1.1;
export const UPGRADE_HUD_GAP = 12;
const UPGRADE_HUD_TOP_GAP = 16;
export const UPGRADE_HUD_RIGHT_PAD = 20;

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

export const TRINKET_STACK_DEPTH = 3;
export const TRINKET_POOL_COLUMNS = UPGRADE_HUD_COLUMNS * 2;
export const TRINKET_LAYER_OFFSET = 2;
export const UPGRADE_HUD_MIN_ROWS = 2;
const TRINKET_POOL_TOP_GAP = 12;
const TRINKET_POOL_ROW_GAP = 6;

export type TrinketPoolCard<Id> = {
  id: Id;
  stack: number;
  layer: number;
  copies: number;
  x: number;
  y: number;
  size: number;
};

export function trinketPoolLayout<Id>(
  kinds: readonly { id: Id; copies: number }[],
  slotCount: number,
  iconSize: number,
  quarterSize: number,
  left: number = QUARTER_HUD_LEFT,
): TrinketPoolCard<Id>[] {
  const size = Math.max(1, Math.floor(iconSize / 2));
  const span = UPGRADE_HUD_COLUMNS * (iconSize + UPGRADE_HUD_GAP) - UPGRADE_HUD_GAP;
  const pitch = Math.floor((span - size) / (TRINKET_POOL_COLUMNS - 1));
  const rowPitch = pitch + TRINKET_LAYER_OFFSET * (TRINKET_STACK_DEPTH - 1) + TRINKET_POOL_ROW_GAP;
  const slotRows = Math.max(UPGRADE_HUD_MIN_ROWS, Math.ceil(slotCount / UPGRADE_HUD_COLUMNS));
  const firstSlot = upgradeHudIconPosition(0, iconSize, quarterSize, left);
  const top =
    firstSlot.y - iconSize / 2 + slotRows * (iconSize + UPGRADE_HUD_GAP) + TRINKET_POOL_TOP_GAP;
  const cards: TrinketPoolCard<Id>[] = [];
  let stack = 0;
  for (const { id, copies } of kinds) {
    for (let start = 0; start < copies; start += TRINKET_STACK_DEPTH) {
      const layers = Math.min(TRINKET_STACK_DEPTH, copies - start);
      const col = stack % TRINKET_POOL_COLUMNS;
      const row = Math.floor(stack / TRINKET_POOL_COLUMNS);
      for (let layer = 0; layer < layers; layer += 1) {
        cards.push({
          id,
          stack,
          layer,
          copies,
          size,
          x: left + size / 2 + col * pitch + layer * TRINKET_LAYER_OFFSET,
          y: top + size / 2 + row * rowPitch + layer * TRINKET_LAYER_OFFSET,
        });
      }
      stack += 1;
    }
  }
  return cards;
}

const UPGRADE_HUD_TEXT_GAP = 20;

export function upgradeHudTextAnchor(
  boxes: readonly { x: number; y: number; size: number }[],
  iconSize: number,
  quarterSize: number,
  left: number = QUARTER_HUD_LEFT,
): { x: number; y: number } {
  const middle = upgradeHudIconPosition(1, iconSize, quarterSize, left);
  const bottom = Math.max(middle.y + iconSize / 2, ...boxes.map((box) => box.y + box.size / 2));
  return { x: middle.x, y: bottom + UPGRADE_HUD_TEXT_GAP };
}
