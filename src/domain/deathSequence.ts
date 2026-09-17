export const DEATH_FADE_START_MS = 500;
export const DEATH_FADE_DURATION_MS = 500;

export type DeathSequenceState = {
  elapsedMs: number;
  fadeStarted: boolean;
};

export function beginDeathSequence(): DeathSequenceState {
  return { elapsedMs: 0, fadeStarted: false };
}

export function tickDeathSequence(
  state: DeathSequenceState,
  deltaMs: number,
): { state: DeathSequenceState; shouldStartFade: boolean } {
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs);
  const shouldStartFade = !state.fadeStarted && elapsedMs >= DEATH_FADE_START_MS;
  return {
    state: {
      elapsedMs,
      fadeStarted: state.fadeStarted || shouldStartFade,
    },
    shouldStartFade,
  };
}
