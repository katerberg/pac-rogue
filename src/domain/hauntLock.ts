export const HAUNT_LOCK_KEY = "haunt-lock";
export const HAUNT_LOCK_PATH = "art/other/lock.png";
export const HAUNT_GHOST_COLOR = 0x808080;
export const HAUNT_LOCK_URGENCY_MS = 1000;
export const HAUNT_LOCK_BLINK_MS = 100;

export function hauntLockVisible(remainingMs: number, nowMs: number): boolean {
  if (remainingMs <= 0) {
    return false;
  }
  return remainingMs > HAUNT_LOCK_URGENCY_MS || Math.floor(nowMs / HAUNT_LOCK_BLINK_MS) % 2 === 0;
}
