import { clamp } from "./clamp";

export const BOSS_STAGE_ENTITY_FADE_MS = 1200;
export const BOSS_STAGE_FLICKER_PULSE_MS = 100;
export const BOSS_STAGE_FLICKER_PULSES = 5;
export const BOSS_STAGE_FLICKER_MS = BOSS_STAGE_FLICKER_PULSE_MS * 2 * BOSS_STAGE_FLICKER_PULSES;
export const BOSS_STAGE_BLACK_HOLD_MS = 800;
export const BOSS_STAGE_TOTAL_MS =
  BOSS_STAGE_ENTITY_FADE_MS +
  BOSS_STAGE_FLICKER_MS +
  BOSS_STAGE_BLACK_HOLD_MS +
  BOSS_STAGE_FLICKER_MS +
  BOSS_STAGE_ENTITY_FADE_MS;

export type BossStageTransitionPhase =
  | "entityFadeOut"
  | "mazeFlickerOut"
  | "rebuild"
  | "blackHold"
  | "mazeFlickerIn"
  | "entityFadeIn"
  | "done";

export type BossStageTransition = {
  elapsedMs: number;
  rebuilt: boolean;
  cutSuccessSfxEmitted: boolean;
  startGameplayMusicEmitted: boolean;
};

export type BossStageTransitionTick = {
  phase: BossStageTransitionPhase;
  entityAlpha: number;
  wallAlpha: number;
  cutSuccessSfx: boolean;
  startGameplayMusic: boolean;
  shouldRebuild: boolean;
  done: boolean;
  state: BossStageTransition;
};

const ENTITY_FADE_OUT_END = BOSS_STAGE_ENTITY_FADE_MS;
const MAZE_FLICKER_OUT_END = ENTITY_FADE_OUT_END + BOSS_STAGE_FLICKER_MS;
const BLACK_HOLD_END = MAZE_FLICKER_OUT_END + BOSS_STAGE_BLACK_HOLD_MS;
const MAZE_FLICKER_IN_END = BLACK_HOLD_END + BOSS_STAGE_FLICKER_MS;

export function createBossStageTransition(): BossStageTransition {
  return {
    elapsedMs: 0,
    rebuilt: false,
    cutSuccessSfxEmitted: false,
    startGameplayMusicEmitted: false,
  };
}

function flickerAlpha(elapsedInPhase: number): number {
  const pulseIndex = Math.floor(elapsedInPhase / BOSS_STAGE_FLICKER_PULSE_MS);
  return pulseIndex % 2 === 0 ? 1 : 0;
}

export function tickBossStageTransition(
  state: BossStageTransition,
  deltaMs: number,
): BossStageTransitionTick {
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs);
  let { rebuilt, cutSuccessSfxEmitted, startGameplayMusicEmitted } = state;

  let phase: BossStageTransitionPhase;
  let entityAlpha = 1;
  let wallAlpha = 1;
  let shouldRebuild = false;

  if (!rebuilt && elapsedMs >= MAZE_FLICKER_OUT_END) {
    phase = "rebuild";
    entityAlpha = 0;
    wallAlpha = 0;
    shouldRebuild = true;
    rebuilt = true;
  } else if (elapsedMs < ENTITY_FADE_OUT_END) {
    phase = "entityFadeOut";
    entityAlpha = 1 - elapsedMs / BOSS_STAGE_ENTITY_FADE_MS;
    wallAlpha = 1;
  } else if (elapsedMs < MAZE_FLICKER_OUT_END) {
    phase = "mazeFlickerOut";
    entityAlpha = 0;
    wallAlpha = flickerAlpha(elapsedMs - ENTITY_FADE_OUT_END);
  } else if (elapsedMs < BLACK_HOLD_END) {
    phase = "blackHold";
    entityAlpha = 0;
    wallAlpha = 0;
  } else if (elapsedMs < MAZE_FLICKER_IN_END) {
    phase = "mazeFlickerIn";
    entityAlpha = 0;
    wallAlpha = flickerAlpha(elapsedMs - BLACK_HOLD_END);
  } else if (elapsedMs < BOSS_STAGE_TOTAL_MS) {
    phase = "entityFadeIn";
    entityAlpha = (elapsedMs - MAZE_FLICKER_IN_END) / BOSS_STAGE_ENTITY_FADE_MS;
    wallAlpha = 1;
  } else {
    phase = "done";
    entityAlpha = 1;
    wallAlpha = 1;
  }

  const cutSuccessSfx = !cutSuccessSfxEmitted && elapsedMs >= MAZE_FLICKER_OUT_END;
  if (cutSuccessSfx) {
    cutSuccessSfxEmitted = true;
  }

  const startGameplayMusic = !startGameplayMusicEmitted && elapsedMs >= MAZE_FLICKER_IN_END;
  if (startGameplayMusic) {
    startGameplayMusicEmitted = true;
  }

  const done = phase === "done";

  return {
    phase,
    entityAlpha: clamp(entityAlpha, 0, 1),
    wallAlpha: clamp(wallAlpha, 0, 1),
    cutSuccessSfx,
    startGameplayMusic,
    shouldRebuild,
    done,
    state: {
      elapsedMs,
      rebuilt,
      cutSuccessSfxEmitted,
      startGameplayMusicEmitted,
    },
  };
}
