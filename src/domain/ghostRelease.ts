import { GHOST_KIND, type GhostKindId } from "./ghostKind";

/** Tune per ghost — clock starts on first player direction input. */
export const BLINKY_RELEASE_DELAY_MS = 100;
export const PINKY_RELEASE_DELAY_MS = 5_000;

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
