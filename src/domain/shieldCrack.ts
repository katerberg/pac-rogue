import { HUD_BOTTOM_MARGIN_PX } from "./playfieldBounds";

export const SHIELD_CRACK_MS = 600;
export const SHIELD_CRACK_SPLIT_PX = 6;
export const SHIELD_CRACK_FALL_PX = 18;
export const SHIELD_CRACK_SPIN_RAD = 0.6;
export const SHIELD_HUD_SIZE_FRAC = 0.6;
export const SHIELD_HUD_COLOR = 0x7fd4ff;
export const HUD_ICON_LEFT_X = 12;
export const HUD_ICON_GAP = 4;
export { HUD_BOTTOM_MARGIN_PX };

export function shieldCrackProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / SHIELD_CRACK_MS));
}

export function shieldCrackLook(progress: number): {
  offsetX: number;
  dropY: number;
  rotation: number;
  alpha: number;
} {
  const t = Math.min(1, Math.max(0, progress));
  return {
    offsetX: SHIELD_CRACK_SPLIT_PX * (1 - (1 - t) ** 2),
    dropY: SHIELD_CRACK_FALL_PX * t * t,
    rotation: SHIELD_CRACK_SPIN_RAD * t,
    alpha: 1 - t,
  };
}

export function shieldHudIconX(lifeIconCount: number, index: number, lifeIconSize: number): number {
  const shieldSize = lifeIconSize * SHIELD_HUD_SIZE_FRAC;
  const firstLeft = HUD_ICON_LEFT_X + lifeIconCount * (lifeIconSize + HUD_ICON_GAP);
  return firstLeft + shieldSize / 2 + index * (shieldSize + HUD_ICON_GAP);
}

/** How many equal-size icons fit left of `rightLimit` (maze left edge). */
export function hudIconsThatFit(
  count: number,
  iconSize: number,
  rightLimit: number,
  leftX: number = HUD_ICON_LEFT_X,
  gap: number = HUD_ICON_GAP,
): number {
  let fit = 0;
  for (let i = 0; i < count; i += 1) {
    const right = leftX + (i + 1) * iconSize + i * gap;
    if (right > rightLimit) {
      break;
    }
    fit += 1;
  }
  return fit;
}

/** Shields after a life row; only those whose right edge stays left of the maze. */
export function shieldHudIconsThatFit(
  shieldCount: number,
  lifeIconCount: number,
  lifeIconSize: number,
  rightLimit: number,
): number {
  const shieldSize = lifeIconSize * SHIELD_HUD_SIZE_FRAC;
  let fit = 0;
  for (let i = 0; i < shieldCount; i += 1) {
    const right = shieldHudIconX(lifeIconCount, i, lifeIconSize) + shieldSize / 2;
    if (right > rightLimit) {
      break;
    }
    fit += 1;
  }
  return fit;
}

export function hudIconCenterY(
  iconSize: number,
  playfieldHeight: number,
  bottomMargin: number = HUD_BOTTOM_MARGIN_PX,
): number {
  return playfieldHeight - bottomMargin - iconSize / 2;
}
