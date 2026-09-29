import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { GhostModeWave } from "./ghostMode";

export const MAX_LEVEL = 9;

const CHASE_ONLY_WAVES: readonly GhostModeWave[] = [
  { mode: 1, durationMs: Number.POSITIVE_INFINITY },
];

function arcadeWaves(openingScatterMs: number, laterScatterMs: number): readonly GhostModeWave[] {
  return [
    { mode: 0, durationMs: openingScatterMs },
    { mode: 1, durationMs: 20_000 },
    { mode: 0, durationMs: openingScatterMs },
    { mode: 1, durationMs: 20_000 },
    { mode: 0, durationMs: laterScatterMs },
    { mode: 1, durationMs: Number.POSITIVE_INFINITY },
  ];
}

const LEVEL_2_TO_4_WAVES = arcadeWaves(7_000, 5_000);
const LEVEL_5_PLUS_WAVES = arcadeWaves(5_000, 5_000);

export function offersUpgradeAfterLevel(levelIndex: number): boolean {
  return levelIndex > 1 && levelIndex < MAX_LEVEL;
}

export function speedLevelMultiplier(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return 1 + 0.05 * (level - 1);
}

export function ghostBaseSpeedRatio(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return Math.min(1, 0.8 + 0.05 * (level - 1));
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

export function ghostModeWavesForLevel(levelIndex: number): readonly GhostModeWave[] {
  const level = Math.max(1, levelIndex);
  if (level <= 1) {
    return CHASE_ONLY_WAVES;
  }
  return level <= 4 ? LEVEL_2_TO_4_WAVES : LEVEL_5_PLUS_WAVES;
}

export function isInvertedMazeLevel(levelIndex: number): boolean {
  return levelIndex === 6 || levelIndex === 7;
}
