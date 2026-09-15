export const GHOST_AI_MODE = {
  scatter: 0,
  chase: 1,
} as const;

export type GhostAiMode = (typeof GHOST_AI_MODE)[keyof typeof GHOST_AI_MODE];

export type GhostModeWave = {
  mode: GhostAiMode;
  durationMs: number;
};

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
  const first = LEVEL1_WAVES[0]!;
  return {
    active: false,
    waveIndex: 0,
    elapsedMs: 0,
    mode: first.mode,
  };
}

export function startGhostModeClock(): GhostModeClock {
  const first = LEVEL1_WAVES[0]!;
  return {
    active: true,
    waveIndex: 0,
    elapsedMs: 0,
    mode: first.mode,
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
