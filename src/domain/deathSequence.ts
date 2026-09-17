export const DEATH_HOLD_MS = 845;
export const READY_PAUSE_MS = 1000;
export const GAME_OVER_HOLD_MS = 2000;
export const DEATH_FADE_DURATION_MS = 500;

export type DeathSequencePhase =
  "hold" | "ready" | "fadeToGameOver" | "gameOver" | "doneResume" | "doneMenu";

export type DeathSequenceEvent =
  "resetActors" | "startFade" | "showGameOver" | "resume" | "goToMenu";

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
): { state: DeathSequenceState; events: DeathSequenceEvent[] } {
  if (state.phase === "doneResume" || state.phase === "doneMenu") {
    return { state, events: [] };
  }

  let next: DeathSequenceState = {
    ...state,
    phaseElapsedMs: state.phaseElapsedMs + Math.max(0, deltaMs),
  };
  const events: DeathSequenceEvent[] = [];

  while (true) {
    if (next.phase === "hold") {
      if (next.phaseElapsedMs < DEATH_HOLD_MS) {
        break;
      }
      const leftover = next.phaseElapsedMs - DEATH_HOLD_MS;
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
      if (next.phaseElapsedMs < READY_PAUSE_MS) {
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

    if (next.phase === "gameOver") {
      if (next.phaseElapsedMs < GAME_OVER_HOLD_MS) {
        break;
      }
      events.push("goToMenu");
      next = { gameOver: true, phase: "doneMenu", phaseElapsedMs: 0 };
      break;
    }

    break;
  }

  return { state: next, events };
}
