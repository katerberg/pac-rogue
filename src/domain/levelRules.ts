import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { GhostModeWave } from "./ghostMode";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export { ghostBaseSpeedRatio, speedLevelMultiplier } from "./tuning";

export const MAX_LEVEL = 9;

const CHASE_ONLY_WAVES: readonly GhostModeWave[] = [
  { mode: 1, durationMs: Number.POSITIVE_INFINITY },
];

function arcadeWaves(
  openingScatterMs: number,
  laterScatterMs: number,
  chaseMs: number,
): readonly GhostModeWave[] {
  return [
    { mode: 0, durationMs: openingScatterMs },
    { mode: 1, durationMs: chaseMs },
    { mode: 0, durationMs: openingScatterMs },
    { mode: 1, durationMs: chaseMs },
    { mode: 0, durationMs: laterScatterMs },
    { mode: 1, durationMs: Number.POSITIVE_INFINITY },
  ];
}

const TAPER_SECOND_SCATTER_FRACTION = 0.6;

function lateWaves(level: number, tuning: Tuning): readonly GhostModeWave[] {
  const full = tuning.scatterLateMs;
  const short = full * TAPER_SECOND_SCATTER_FRACTION;
  if (level >= MAX_LEVEL) {
    return CHASE_ONLY_WAVES;
  }
  if (level === MAX_LEVEL - 1) {
    return [
      { mode: 0, durationMs: short },
      { mode: 1, durationMs: Number.POSITIVE_INFINITY },
    ];
  }
  if (level === MAX_LEVEL - 2) {
    return [
      { mode: 0, durationMs: full },
      { mode: 1, durationMs: tuning.chaseMs },
      { mode: 0, durationMs: short },
      { mode: 1, durationMs: Number.POSITIVE_INFINITY },
    ];
  }
  return arcadeWaves(full, full, tuning.chaseMs);
}

const DEFAULT_EARLY_WAVES = arcadeWaves(
  DEFAULT_TUNING.scatterEarlyMs,
  DEFAULT_TUNING.scatterLateMs,
  DEFAULT_TUNING.chaseMs,
);
const DEFAULT_LATE_WAVES = Array.from({ length: MAX_LEVEL - 4 }, (_, i) =>
  lateWaves(i + 5, DEFAULT_TUNING),
);

export function offersUpgradeAfterLevel(levelIndex: number): boolean {
  return levelIndex > 1 && levelIndex < MAX_LEVEL;
}

const ENHANCED_OFFER_FIRST_LEVEL = 4;
const ENHANCED_OFFER_CHANCE = 1 / 8;

export function enhancedOfferChance(levelIndex: number): number {
  return levelIndex >= ENHANCED_OFFER_FIRST_LEVEL && offersUpgradeAfterLevel(levelIndex)
    ? ENHANCED_OFFER_CHANCE
    : 0;
}

export function ghostKindsForLevel(
  levelIndex: number,
  secondGhostKind: GhostKindId,
): GhostKindId[] {
  const level = Math.max(1, levelIndex);
  if (level === 1) {
    return [GHOST_KIND.blinky, secondGhostKind];
  }
  if (level === 2) {
    const thirdGhostKind =
      secondGhostKind === GHOST_KIND.pinky ? GHOST_KIND.inky : GHOST_KIND.pinky;
    return [GHOST_KIND.blinky, secondGhostKind, thirdGhostKind];
  }
  return [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde];
}

export function ghostModeWavesForLevel(
  levelIndex: number,
  tuning: Tuning = DEFAULT_TUNING,
): readonly GhostModeWave[] {
  const level = Math.max(1, levelIndex);
  if (level <= 1 && tuning.level1ChaseOnly) {
    return CHASE_ONLY_WAVES;
  }
  if (level > 4) {
    return tuning === DEFAULT_TUNING
      ? DEFAULT_LATE_WAVES[Math.min(level, MAX_LEVEL) - 5]!
      : lateWaves(level, tuning);
  }
  if (tuning === DEFAULT_TUNING) {
    return DEFAULT_EARLY_WAVES;
  }
  return arcadeWaves(tuning.scatterEarlyMs, tuning.scatterLateMs, tuning.chaseMs);
}

export function isInvertedMazeLevel(levelIndex: number): boolean {
  return levelIndex === 6 || levelIndex === 7;
}

export function isTimedTunnelLevel(levelIndex: number): boolean {
  return levelIndex === 7 || levelIndex === 8;
}
