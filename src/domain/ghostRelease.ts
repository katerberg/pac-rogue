import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { getActiveLayout } from "./maze";

export const BLINKY_RELEASE_DELAY_MS = 100;
export const PINKY_RELEASE_DELAY_MS = 0;

export const LEVEL2_CLYDE_RELEASE_DOTS = 50;
export const POST_LIFE_PINKY_RELEASE_DOTS = 7;
export const POST_LIFE_INKY_RELEASE_DOTS = 17;
export const POST_LIFE_CLYDE_RELEASE_DOTS = 32;

export const IDLE_RELEASE_MS = 4_000;
export const IDLE_RELEASE_LATE_MS = 3_000;
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

export function idleReleaseLimitMs(level: number, delayAddMs = 0): number {
  return (
    (level >= IDLE_RELEASE_LATE_FROM_LEVEL ? IDLE_RELEASE_LATE_MS : IDLE_RELEASE_MS) + delayAddMs
  );
}

export function idleReleaseDue(clock: GhostReleaseClock, delayAddMs = 0): boolean {
  return clock.started && clock.idleMs >= idleReleaseLimitMs(clock.level, delayAddMs);
}

export function pickIdleReleaseKind(kinds: readonly GhostKindId[]): GhostKindId | null {
  for (const kind of GHOST_RELEASE_PRIORITY) {
    if (kinds.includes(kind)) {
      return kind;
    }
  }
  return null;
}

export function shouldReleaseGhostAt(clock: GhostReleaseClock, delayMs: number): boolean {
  return clock.started && clock.elapsedMs >= delayMs;
}

export type GhostReleaseAdds = {
  delayAddMs?: number;
  clydePelletAdd?: number;
};

export function isTimeGatedRelease(kind: GhostKindId, afterLifeRelease: boolean): boolean {
  return kind === GHOST_KIND.blinky || (kind === GHOST_KIND.pinky && !afterLifeRelease);
}

export function releaseDelayMs(kind: GhostKindId, delayAddMs = 0): number {
  return (
    (kind === GHOST_KIND.blinky ? BLINKY_RELEASE_DELAY_MS : PINKY_RELEASE_DELAY_MS) + delayAddMs
  );
}

export function releaseDots(
  kind: GhostKindId,
  level: number,
  afterLifeRelease: boolean,
  clydePelletAdd = 0,
): number {
  const clydeAdd = kind === GHOST_KIND.clyde ? clydePelletAdd : 0;
  if (afterLifeRelease) {
    switch (kind) {
      case GHOST_KIND.pinky:
        return POST_LIFE_PINKY_RELEASE_DOTS;
      case GHOST_KIND.inky:
        return POST_LIFE_INKY_RELEASE_DOTS;
      case GHOST_KIND.clyde:
        return POST_LIFE_CLYDE_RELEASE_DOTS + clydeAdd;
      case GHOST_KIND.blinky:
        return 0;
    }
  }
  const layout = getActiveLayout();
  switch (kind) {
    case GHOST_KIND.inky:
      return level <= 1 ? layout.inkyReleasePellets : 0;
    case GHOST_KIND.clyde:
      return (
        (level <= 1 ? layout.clydeReleasePellets : level === 2 ? LEVEL2_CLYDE_RELEASE_DOTS : 0) +
        clydeAdd
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
    return shouldReleaseGhostAt(clock, releaseDelayMs(kind, adds.delayAddMs ?? 0));
  }
  const dots = afterLifeRelease ? collectedCount - clock.baselineCollected : collectedCount;
  return (
    clock.started && dots >= releaseDots(kind, clock.level, afterLifeRelease, adds.clydePelletAdd)
  );
}
