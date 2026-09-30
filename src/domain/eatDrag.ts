export const EAT_DRAG_PEAK = 0.25;
export const EAT_DRAG_MS = 100;
export const EAT_DRAG_POWER_MS = EAT_DRAG_MS * 3;

export function eatDragAfterCollect(
  remainingMs: number,
  regularRemoved: number,
  powerRemoved: number,
): number {
  if (powerRemoved > 0) {
    return Math.max(remainingMs, EAT_DRAG_POWER_MS);
  }
  if (regularRemoved > 0) {
    return Math.max(remainingMs, EAT_DRAG_MS);
  }
  return remainingMs;
}

export function tickEatDrag(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}

export function eatDragMultiplier(remainingMs: number): number {
  return 1 - EAT_DRAG_PEAK * Math.min(1, Math.max(0, remainingMs) / EAT_DRAG_MS);
}
