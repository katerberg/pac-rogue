import type { GhostKindId } from "./ghostKind";
import { GHOST_ROSTERS } from "./ghostRoster";
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
  return levelIndex >= 1 && levelIndex < MAX_LEVEL;
}

const ENHANCED_OFFER_FIRST_LEVEL = 4;
const ENHANCED_OFFER_CHANCE = 1 / 8;

export function enhancedOfferChance(levelIndex: number): number {
  return levelIndex >= ENHANCED_OFFER_FIRST_LEVEL && offersUpgradeAfterLevel(levelIndex)
    ? ENHANCED_OFFER_CHANCE
    : 0;
}

export function ghostKindsForLevel(levelIndex: number, rosterId: number): GhostKindId[] {
  const roster = GHOST_ROSTERS[rosterId]!;
  const level = Math.max(1, levelIndex);
  return roster.slice(0, level === 1 ? 2 : level === 2 ? 3 : roster.length);
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

export function isTimedTunnelLevel(levelIndex: number): boolean {
  return levelIndex === 7 || levelIndex === 8;
}
