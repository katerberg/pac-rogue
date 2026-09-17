export const GHOST_AI_MODE = {
  scatter: 0,
  chase: 1,
} as const;

export type GhostAiMode = (typeof GHOST_AI_MODE)[keyof typeof GHOST_AI_MODE];

export type GhostModeWave = {
  mode: GhostAiMode;
  durationMs: number;
};

/** Arcade level-1 scatter/chase table (seconds). */
const LEVEL1_WAVES: readonly GhostModeWave[] = [
  { mode: GHOST_AI_MODE.scatter, durationMs: 7_000 },
  { mode: GHOST_AI_MODE.chase, durationMs: 20_000 },
  { mode: GHOST_AI_MODE.scatter, durationMs: 7_000 },
  { mode: GHOST_AI_MODE.chase, durationMs: 20_000 },
  { mode: GHOST_AI_MODE.scatter, durationMs: 5_000 },
  { mode: GHOST_AI_MODE.chase, durationMs: 20_000 },
  { mode: GHOST_AI_MODE.scatter, durationMs: 5_000 },
  { mode: GHOST_AI_MODE.chase, durationMs: Number.POSITIVE_INFINITY },
];

/** Skip opening arcade scatter so Blinky begins in chase; later waves stay arcade. */
const START_WAVE_INDEX = 1;

export type GhostModeClock = {
  active: boolean;
  waveIndex: number;
  elapsedMs: number;
  mode: GhostAiMode;
};

export type GhostModeTick = {
  clock: GhostModeClock;
  forceReverse: boolean;
};

export function createGhostModeClock(): GhostModeClock {
  const start = LEVEL1_WAVES[START_WAVE_INDEX]!;
  return {
    active: false,
    waveIndex: START_WAVE_INDEX,
    elapsedMs: 0,
    mode: start.mode,
  };
}

export function startGhostModeClock(): GhostModeClock {
  const start = LEVEL1_WAVES[START_WAVE_INDEX]!;
  return {
    active: true,
    waveIndex: START_WAVE_INDEX,
    elapsedMs: 0,
    mode: start.mode,
  };
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
  if (scatterBurstActive) {
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

  const wave = LEVEL1_WAVES[clock.waveIndex];
  if (!wave || !Number.isFinite(wave.durationMs)) {
    return { clock, forceReverse: false };
  }

  let elapsedMs = clock.elapsedMs + Math.max(0, deltaMs);
  let waveIndex = clock.waveIndex;
  let mode = clock.mode;
  let forceReverse = false;

  while (waveIndex < LEVEL1_WAVES.length) {
    const current = LEVEL1_WAVES[waveIndex]!;
    if (!Number.isFinite(current.durationMs) || elapsedMs < current.durationMs) {
      mode = current.mode;
      break;
    }
    elapsedMs -= current.durationMs;
    waveIndex += 1;
    const next = LEVEL1_WAVES[waveIndex];
    if (!next) {
      waveIndex = LEVEL1_WAVES.length - 1;
      mode = LEVEL1_WAVES[waveIndex]!.mode;
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
      waveIndex,
      elapsedMs,
      mode,
    },
    forceReverse,
  };
}
