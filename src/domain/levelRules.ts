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

const DEFAULT_EARLY_WAVES = arcadeWaves(
  DEFAULT_TUNING.scatterEarlyMs,
  DEFAULT_TUNING.scatterLateMs,
  DEFAULT_TUNING.chaseMs,
);
const DEFAULT_LATE_WAVES = arcadeWaves(
  DEFAULT_TUNING.scatterLateMs,
  DEFAULT_TUNING.scatterLateMs,
  DEFAULT_TUNING.chaseMs,
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
  const late = level > 4;
  if (tuning === DEFAULT_TUNING) {
    return late ? DEFAULT_LATE_WAVES : DEFAULT_EARLY_WAVES;
  }
  const opening = late ? tuning.scatterLateMs : tuning.scatterEarlyMs;
  return arcadeWaves(opening, tuning.scatterLateMs, tuning.chaseMs);
}

export function isInvertedMazeLevel(levelIndex: number): boolean {
  return levelIndex === 6 || levelIndex === 7;
}

export function isTimedTunnelLevel(levelIndex: number): boolean {
  return levelIndex === 7 || levelIndex === 8;
}
