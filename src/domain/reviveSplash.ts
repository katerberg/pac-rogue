import { READY_PAUSE_MS } from "./deathSequence";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";

export const REVIVE_SPLASH_MS = READY_PAUSE_MS;
export const REVIVE_BOUNCE_START = 0.3;
export const REVIVE_BOUNCE_END = 0.4;
export const REVIVE_BOUNCE_SIZE_FRAC = 0.1;
export const REVIVE_BOUNCE_ALPHA = 0.12;

export function reviveSplashProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / REVIVE_SPLASH_MS));
}

function reviveBounce(t: number): number {
  if (t <= REVIVE_BOUNCE_START || t >= REVIVE_BOUNCE_END) {
    return 0;
  }
  return Math.sin(
    ((t - REVIVE_BOUNCE_START) / (REVIVE_BOUNCE_END - REVIVE_BOUNCE_START)) * Math.PI,
  );
}

export function reviveSplashLook(
  progress: number,
  baseSize: number,
  startSize = PLAYFIELD_WIDTH,
): { size: number; alpha: number } {
  const t = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - t) ** 3;
  const bounce = reviveBounce(t);
  return {
    size:
      startSize +
      (baseSize - startSize) * eased +
      (startSize - baseSize) * REVIVE_BOUNCE_SIZE_FRAC * bounce,
    alpha: Math.min(1, t + REVIVE_BOUNCE_ALPHA * bounce),
  };
}
