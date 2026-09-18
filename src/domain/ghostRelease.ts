import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { getActiveLayout } from "./maze";

export const BLINKY_RELEASE_DELAY_MS = 100;
export const PINKY_RELEASE_DELAY_MS = 5_000;
export const INKY_POST_LIFE_RELEASE_DELAY_MS = 7_000;
export const CLYDE_POST_LIFE_RELEASE_DELAY_MS = 9_000;

export type GhostReleaseClock = {
  started: boolean;
  elapsedMs: number;
};

export function createGhostReleaseClock(): GhostReleaseClock {
  return { started: false, elapsedMs: 0 };
}

export function tickGhostRelease(
  clock: GhostReleaseClock,
  hasDirectionInput: boolean,
  deltaMs: number,
): GhostReleaseClock {
  const started = clock.started || hasDirectionInput;
  if (!started) {
    return clock;
  }
  return {
    started: true,
    elapsedMs: clock.elapsedMs + Math.max(0, deltaMs),
  };
}

export function releaseDelayForKind(kind: GhostKindId): number {
  switch (kind) {
    case GHOST_KIND.pinky:
      return PINKY_RELEASE_DELAY_MS;
    case GHOST_KIND.blinky:
      return BLINKY_RELEASE_DELAY_MS;
    case GHOST_KIND.inky:
    case GHOST_KIND.clyde:
      throw new Error("pellet-gated ghosts use pellet release, not a time delay");
  }
}

export function shouldReleaseGhostAt(clock: GhostReleaseClock, delayMs: number): boolean {
  return clock.started && clock.elapsedMs >= delayMs;
}

export type GhostReleaseAdds = {
  delayAddMs?: number;
  clydePelletAdd?: number;
};

function shouldReleasePelletGated(
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease: boolean,
  pelletThreshold: number,
  postLifeDelayMs: number,
): boolean {
  if (afterLifeRelease) {
    return shouldReleaseGhostAt(clock, postLifeDelayMs);
  }
  return collectedCount >= pelletThreshold;
}

export function shouldReleaseKind(
  kind: GhostKindId,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): boolean {
  const delayAddMs = adds.delayAddMs ?? 0;
  const clydePelletAdd = adds.clydePelletAdd ?? 0;
  if (kind === GHOST_KIND.inky) {
    return shouldReleasePelletGated(
      clock,
      collectedCount,
      afterLifeRelease,
      getActiveLayout().inkyReleasePellets,
      INKY_POST_LIFE_RELEASE_DELAY_MS + delayAddMs,
    );
  }
  if (kind === GHOST_KIND.clyde) {
    return shouldReleasePelletGated(
      clock,
      collectedCount,
      afterLifeRelease,
      getActiveLayout().clydeReleasePellets + clydePelletAdd,
      CLYDE_POST_LIFE_RELEASE_DELAY_MS + delayAddMs,
    );
  }
  return shouldReleaseGhostAt(clock, releaseDelayForKind(kind) + delayAddMs);
}
