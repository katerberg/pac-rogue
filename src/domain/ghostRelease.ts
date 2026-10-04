import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { scaleToActiveLayout } from "./maze";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export const BLINKY_RELEASE_DELAY_MS = DEFAULT_TUNING.blinkyReleaseMs;
export const PINKY_RELEASE_DELAY_MS = DEFAULT_TUNING.pinkyReleaseMs;

export const LEVEL2_CLYDE_RELEASE_DOTS = DEFAULT_TUNING.level2ClydeDots;
export const POST_LIFE_PINKY_RELEASE_DOTS = DEFAULT_TUNING.postLifePinkyDots;
export const POST_LIFE_INKY_RELEASE_DOTS = DEFAULT_TUNING.postLifeInkyDots;
export const POST_LIFE_CLYDE_RELEASE_DOTS = DEFAULT_TUNING.postLifeClydeDots;

export const IDLE_RELEASE_MS = DEFAULT_TUNING.idleReleaseMs;
export const IDLE_RELEASE_LATE_MS = DEFAULT_TUNING.idleReleaseLateMs;
export const IDLE_RELEASE_LATE_FROM_LEVEL = 5;

export const GHOST_RELEASE_PRIORITY: readonly GhostKindId[] = [
  GHOST_KIND.blinky,
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.clyde,
];

export type GhostReleaseClock = {
  started: boolean;
  elapsedMs: number;
  level: number;
  baselineCollected: number;
  lastCollected: number;
  idleMs: number;
};

export function createGhostReleaseClock(level = 1, baselineCollected = 0): GhostReleaseClock {
  return {
    started: false,
    elapsedMs: 0,
    level,
    baselineCollected,
    lastCollected: baselineCollected,
    idleMs: 0,
  };
}

export function tickGhostRelease(
  clock: GhostReleaseClock,
  hasDirectionInput: boolean,
  deltaMs: number,
  collectedCount: number = clock.lastCollected,
): GhostReleaseClock {
  const started = clock.started || hasDirectionInput;
  if (!started) {
    return clock;
  }
  const ateDot = collectedCount > clock.lastCollected;
  return {
    ...clock,
    started: true,
    elapsedMs: clock.elapsedMs + Math.max(0, deltaMs),
    lastCollected: collectedCount,
    idleMs: ateDot ? 0 : clock.idleMs + Math.max(0, deltaMs),
  };
}

export function resetIdle(clock: GhostReleaseClock): GhostReleaseClock {
  return clock.idleMs === 0 ? clock : { ...clock, idleMs: 0 };
}

export function idleReleaseLimitMs(
  level: number,
  delayAddMs = 0,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  return (
    (level >= IDLE_RELEASE_LATE_FROM_LEVEL ? tuning.idleReleaseLateMs : tuning.idleReleaseMs) +
    delayAddMs
  );
}

export function idleReleaseDue(
  clock: GhostReleaseClock,
  delayAddMs = 0,
  tuning: Tuning = DEFAULT_TUNING,
): boolean {
  return clock.started && clock.idleMs >= idleReleaseLimitMs(clock.level, delayAddMs, tuning);
}

export function shouldReleaseGhostAt(clock: GhostReleaseClock, delayMs: number): boolean {
  return clock.started && clock.elapsedMs >= delayMs;
}

export type GhostReleaseAdds = {
  delayAddMs?: number;
  clydePelletAdd?: number;
  tuning?: Tuning;
  heldGhostEid?: number | null;
};

export function isTimeGatedRelease(kind: GhostKindId, afterLifeRelease: boolean): boolean {
  return kind === GHOST_KIND.blinky || (kind === GHOST_KIND.pinky && !afterLifeRelease);
}

export function releaseDelayMs(
  kind: GhostKindId,
  delayAddMs = 0,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  return (kind === GHOST_KIND.blinky ? tuning.blinkyReleaseMs : tuning.pinkyReleaseMs) + delayAddMs;
}

export function releaseDots(
  kind: GhostKindId,
  level: number,
  afterLifeRelease: boolean,
  clydePelletAdd = 0,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  const clydeAdd = kind === GHOST_KIND.clyde ? clydePelletAdd : 0;
  if (afterLifeRelease) {
    switch (kind) {
      case GHOST_KIND.pinky:
        return tuning.postLifePinkyDots;
      case GHOST_KIND.inky:
        return tuning.postLifeInkyDots;
      case GHOST_KIND.clyde:
        return tuning.postLifeClydeDots + clydeAdd;
      case GHOST_KIND.blinky:
        return 0;
    }
  }
  switch (kind) {
    case GHOST_KIND.inky:
      return level <= 1 ? scaleToActiveLayout(tuning.inkyReleasePellets) : 0;
    case GHOST_KIND.clyde:
      return (
        (level <= 1
          ? scaleToActiveLayout(tuning.clydeReleasePellets)
          : level === 2
            ? tuning.level2ClydeDots
            : 0) + clydeAdd
      );
    case GHOST_KIND.pinky:
    case GHOST_KIND.blinky:
      return 0;
  }
}

export function shouldReleaseKind(
  kind: GhostKindId,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): boolean {
  if (isTimeGatedRelease(kind, afterLifeRelease)) {
    return shouldReleaseGhostAt(clock, releaseDelayMs(kind, adds.delayAddMs ?? 0, adds.tuning));
  }
  const dots = afterLifeRelease ? collectedCount - clock.baselineCollected : collectedCount;
  return (
    clock.started &&
    dots >= releaseDots(kind, clock.level, afterLifeRelease, adds.clydePelletAdd, adds.tuning)
  );
}
