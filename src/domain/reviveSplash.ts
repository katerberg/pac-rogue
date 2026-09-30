import { READY_PAUSE_MS } from "./deathSequence";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";

export const REVIVE_SPLASH_MS = READY_PAUSE_MS;

export function reviveSplashProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / REVIVE_SPLASH_MS));
}

export function reviveSplashLook(
  progress: number,
  baseSize: number,
  startSize = PLAYFIELD_WIDTH,
): { size: number; alpha: number } {
  const t = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - t) ** 3;
  return { size: startSize + (baseSize - startSize) * eased, alpha: t };
}
