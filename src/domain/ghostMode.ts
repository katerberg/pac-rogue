import { ghostModeStartWaveIndex, ghostModeWavesForLevel } from "./levelRules";

export const GHOST_AI_MODE = {
  scatter: 0,
  chase: 1,
} as const;

export type GhostAiMode = (typeof GHOST_AI_MODE)[keyof typeof GHOST_AI_MODE];

export type GhostModeWave = {
  mode: GhostAiMode;
  durationMs: number;
};

export type GhostModeClock = {
  active: boolean;
  levelIndex: number;
  waveIndex: number;
  elapsedMs: number;
  mode: GhostAiMode;
};

export type GhostModeTick = {
  clock: GhostModeClock;
  forceReverse: boolean;
};

function buildGhostModeClock(levelIndex: number, active: boolean): GhostModeClock {
  const level = Math.max(1, levelIndex);
  const waves = ghostModeWavesForLevel(level);
  const waveIndex = ghostModeStartWaveIndex(level);
  const start = waves[waveIndex]!;
  return {
    active,
    levelIndex: level,
    waveIndex,
    elapsedMs: 0,
    mode: start.mode,
  };
}

export function createGhostModeClock(levelIndex: number): GhostModeClock {
  return buildGhostModeClock(levelIndex, false);
}

export function startGhostModeClock(levelIndex: number): GhostModeClock {
  return buildGhostModeClock(levelIndex, true);
}

export type GhostModeStep = {
  clock: GhostModeClock;
  mode: GhostAiMode;
};

export function resolveGhostModeStep(
  clock: GhostModeClock,
  scatterBurstActive: boolean,
  deltaMs: number,
): GhostModeStep {
  if (scatterBurstActive && clock.active) {
    return {
      clock,
      mode: GHOST_AI_MODE.scatter,
    };
  }
  const tick = tickGhostMode(clock, deltaMs);
  return {
    clock: tick.clock,
    mode: tick.clock.mode,
  };
}

export function tickGhostMode(clock: GhostModeClock, deltaMs: number): GhostModeTick {
  if (!clock.active) {
    return { clock, forceReverse: false };
  }

  const waves = ghostModeWavesForLevel(clock.levelIndex);
  const wave = waves[clock.waveIndex];
  if (!wave || !Number.isFinite(wave.durationMs)) {
    return { clock, forceReverse: false };
  }

  let elapsedMs = clock.elapsedMs + Math.max(0, deltaMs);
  let waveIndex = clock.waveIndex;
  let mode = clock.mode;
  let forceReverse = false;

  while (waveIndex < waves.length) {
    const current = waves[waveIndex]!;
    if (!Number.isFinite(current.durationMs) || elapsedMs < current.durationMs) {
      mode = current.mode;
      break;
    }
    elapsedMs -= current.durationMs;
    waveIndex += 1;
    const next = waves[waveIndex];
    if (!next) {
      waveIndex = waves.length - 1;
      mode = waves[waveIndex]!.mode;
      elapsedMs = 0;
      forceReverse = true;
      break;
    }
    mode = next.mode;
    forceReverse = true;
    if (!Number.isFinite(next.durationMs)) {
      elapsedMs = 0;
      break;
    }
  }

  return {
    clock: {
      active: true,
      levelIndex: clock.levelIndex,
      waveIndex,
      elapsedMs,
      mode,
    },
    forceReverse,
  };
}
