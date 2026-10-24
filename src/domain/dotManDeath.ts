import type { DeathSequenceState } from "./deathSequence";

export const DOTMAN_DEATH_FRAME_COUNT = 10;
export const DOTMAN_DEATH_ART_FRAMES = DOTMAN_DEATH_FRAME_COUNT - 1;

export function dotManDeathFrame(state: DeathSequenceState, holdMs: number): number | undefined {
  switch (state.phase) {
    case "hold":
      return holdMs <= 0
        ? DOTMAN_DEATH_ART_FRAMES
        : Math.min(
            DOTMAN_DEATH_ART_FRAMES,
            Math.floor((state.phaseElapsedMs / holdMs) * DOTMAN_DEATH_FRAME_COUNT),
          );
    case "fadeToGameOver":
    case "gameOver":
      return DOTMAN_DEATH_ART_FRAMES;
    default:
      return undefined;
  }
}
