import { DEFAULT_TUNING, type Tuning } from "./tuning";

export const EAT_DRAG_PEAK = DEFAULT_TUNING.eatDragPeak;
export const EAT_DRAG_MS = DEFAULT_TUNING.eatDragMs;
export const EAT_DRAG_POWER_MS = DEFAULT_TUNING.eatDragPowerMs;

export function eatDragAfterCollect(
  remainingMs: number,
  regularRemoved: number,
  powerRemoved: number,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  if (powerRemoved > 0) {
    return Math.max(remainingMs, tuning.eatDragPowerMs);
  }
  if (regularRemoved > 0) {
    return Math.max(remainingMs, tuning.eatDragMs);
  }
  return remainingMs;
}

export function tickEatDrag(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}

export function eatDragMultiplier(remainingMs: number, tuning: Tuning = DEFAULT_TUNING): number {
  if (tuning.eatDragMs <= 0) {
    return 1;
  }
  return 1 - tuning.eatDragPeak * Math.min(1, Math.max(0, remainingMs) / tuning.eatDragMs);
}
