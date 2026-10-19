import { DEFAULT_TUNING, type Tuning } from "./tuning";

export const DEATH_HOLD_MS = DEFAULT_TUNING.deathHoldMs;
export const READY_PAUSE_MS = DEFAULT_TUNING.readyPauseMs;
export const DEATH_FADE_DURATION_MS = 500;

export type DeathSequencePhase = "hold" | "ready" | "fadeToGameOver" | "gameOver" | "doneResume";

export type DeathSequenceEvent = "resetActors" | "startFade" | "showGameOver" | "resume";

export type DeathSequenceState = {
  gameOver: boolean;
  phase: DeathSequencePhase;
  phaseElapsedMs: number;
};

export function beginDeathSequence(gameOver: boolean): DeathSequenceState {
  return {
    gameOver,
    phase: "hold",
    phaseElapsedMs: 0,
  };
}

export function tickDeathSequence(
  state: DeathSequenceState,
  deltaMs: number,
  tuning: Tuning = DEFAULT_TUNING,
): { state: DeathSequenceState; events: DeathSequenceEvent[] } {
  if (state.phase === "doneResume") {
    return { state, events: [] };
  }

  let next: DeathSequenceState = {
    ...state,
    phaseElapsedMs: state.phaseElapsedMs + Math.max(0, deltaMs),
  };
  const events: DeathSequenceEvent[] = [];

  while (true) {
    if (next.phase === "hold") {
      if (next.phaseElapsedMs < tuning.deathHoldMs) {
        break;
      }
      const leftover = next.phaseElapsedMs - tuning.deathHoldMs;
      if (next.gameOver) {
        events.push("startFade");
        next = { gameOver: true, phase: "fadeToGameOver", phaseElapsedMs: leftover };
        continue;
      }
      events.push("resetActors");
      next = { gameOver: false, phase: "ready", phaseElapsedMs: leftover };
      continue;
    }

    if (next.phase === "ready") {
      if (next.phaseElapsedMs < tuning.readyPauseMs) {
        break;
      }
      events.push("resume");
      next = { gameOver: false, phase: "doneResume", phaseElapsedMs: 0 };
      break;
    }

    if (next.phase === "fadeToGameOver") {
      if (next.phaseElapsedMs < DEATH_FADE_DURATION_MS) {
        break;
      }
      const leftover = next.phaseElapsedMs - DEATH_FADE_DURATION_MS;
      events.push("showGameOver");
      next = { gameOver: true, phase: "gameOver", phaseElapsedMs: leftover };
      continue;
    }

    break;
  }

  return { state: next, events };
}
