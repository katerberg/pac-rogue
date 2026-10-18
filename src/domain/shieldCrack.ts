export const SHIELD_CRACK_MS = 600;
export const SHIELD_CRACK_SPLIT_PX = 6;
export const SHIELD_CRACK_FALL_PX = 18;
export const SHIELD_CRACK_SPIN_RAD = 0.6;
export const SHIELD_COLOR = 0x7fd4ff;

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
