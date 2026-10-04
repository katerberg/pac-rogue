export const SHIELD_CRACK_MS = 600;
export const SHIELD_CRACK_SPLIT_PX = 6;
export const SHIELD_CRACK_FALL_PX = 18;
export const SHIELD_CRACK_SPIN_RAD = 0.6;
export const SHIELD_HUD_SIZE_FRAC = 0.6;
export const SHIELD_HUD_COLOR = 0x7fd4ff;
export const HUD_ICON_LEFT_X = 12;
export const HUD_ICON_GAP = 4;

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
