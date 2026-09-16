import { GHOST_KIND, type GhostKindId } from "./ghostKind";

export const BLINKY_RELEASE_DELAY_MS = 100;
export const PINKY_RELEASE_DELAY_MS = 5_000;
export const CLYDE_RELEASE_PELLETS = 60;

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
    default:
      return BLINKY_RELEASE_DELAY_MS;
  }
}

export function shouldReleaseGhostAt(clock: GhostReleaseClock, delayMs: number): boolean {
  return clock.started && clock.elapsedMs >= delayMs;
}

export function shouldReleaseKind(
  kind: GhostKindId,
  clock: GhostReleaseClock,
  collectedCount: number,
): boolean {
  if (kind === GHOST_KIND.clyde) {
    return collectedCount >= CLYDE_RELEASE_PELLETS;
  }
  return shouldReleaseGhostAt(clock, releaseDelayForKind(kind));
}
