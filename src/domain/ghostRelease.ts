import { RELEASE_SLOT, type ReleaseSlot } from "./ghostRoster";
import { scaleToActiveLayout } from "./maze";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export const ANCHOR_RELEASE_DELAY_MS = DEFAULT_TUNING.anchorReleaseMs;
export const FRONT_RELEASE_DELAY_MS = DEFAULT_TUNING.frontReleaseMs;

export const LEVEL2_RELIEF_RELEASE_DOTS = DEFAULT_TUNING.level2ReliefDots;
export const POST_LIFE_FRONT_RELEASE_DOTS = DEFAULT_TUNING.postLifeFrontDots;
export const POST_LIFE_FLANK_RELEASE_DOTS = DEFAULT_TUNING.postLifeFlankDots;
export const POST_LIFE_RELIEF_RELEASE_DOTS = DEFAULT_TUNING.postLifeReliefDots;

export const IDLE_RELEASE_MS = DEFAULT_TUNING.idleReleaseMs;
export const IDLE_RELEASE_LATE_MS = DEFAULT_TUNING.idleReleaseLateMs;
export const IDLE_RELEASE_LATE_FROM_LEVEL = 5;

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
  reliefPelletAdd?: number;
  tuning?: Tuning;
  heldGhostEids?: readonly number[];
};

export function isTimeGatedRelease(slot: ReleaseSlot, afterLifeRelease: boolean): boolean {
  return slot === RELEASE_SLOT.anchor || (slot === RELEASE_SLOT.front && !afterLifeRelease);
}

export function releaseDelayMs(
  slot: ReleaseSlot,
  delayAddMs = 0,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  return (
    (slot === RELEASE_SLOT.anchor ? tuning.anchorReleaseMs : tuning.frontReleaseMs) + delayAddMs
  );
}

export function releaseDots(
  slot: ReleaseSlot,
  level: number,
  afterLifeRelease: boolean,
  reliefPelletAdd = 0,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  const reliefAdd = slot === RELEASE_SLOT.relief ? reliefPelletAdd : 0;
  if (afterLifeRelease) {
    switch (slot) {
      case RELEASE_SLOT.front:
        return tuning.postLifeFrontDots;
      case RELEASE_SLOT.flank:
        return tuning.postLifeFlankDots;
      case RELEASE_SLOT.relief:
        return tuning.postLifeReliefDots + reliefAdd;
      case RELEASE_SLOT.anchor:
        return 0;
    }
  }
  switch (slot) {
    case RELEASE_SLOT.flank:
      return level <= 1 ? scaleToActiveLayout(tuning.flankReleasePellets) : 0;
    case RELEASE_SLOT.relief:
      return (
        (level <= 1
          ? scaleToActiveLayout(tuning.reliefReleasePellets)
          : level === 2
            ? tuning.level2ReliefDots
            : 0) + reliefAdd
      );
    case RELEASE_SLOT.front:
    case RELEASE_SLOT.anchor:
      return 0;
  }
}

export function shouldReleaseSlot(
  slot: ReleaseSlot,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): boolean {
  if (isTimeGatedRelease(slot, afterLifeRelease)) {
    return shouldReleaseGhostAt(clock, releaseDelayMs(slot, adds.delayAddMs ?? 0, adds.tuning));
  }
  const dots = afterLifeRelease ? collectedCount - clock.baselineCollected : collectedCount;
  return (
    clock.started &&
    dots >= releaseDots(slot, clock.level, afterLifeRelease, adds.reliefPelletAdd, adds.tuning)
  );
}
