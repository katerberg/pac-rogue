export const GHOST_RELEASE_DELAY_MS = 100;

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

export function shouldReleaseGhost(clock: GhostReleaseClock): boolean {
  return clock.started && clock.elapsedMs >= GHOST_RELEASE_DELAY_MS;
}
