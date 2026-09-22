import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { GhostModeWave } from "./ghostMode";

export const MAX_LEVEL = 8;

const CHASE_ONLY_WAVES: readonly GhostModeWave[] = [
  { mode: 1, durationMs: Number.POSITIVE_INFINITY },
];

const ARCADE_WAVES: readonly GhostModeWave[] = [
  { mode: 0, durationMs: 7_000 },
  { mode: 1, durationMs: 20_000 },
  { mode: 0, durationMs: 7_000 },
  { mode: 1, durationMs: 20_000 },
  { mode: 0, durationMs: 5_000 },
  { mode: 1, durationMs: 20_000 },
  { mode: 0, durationMs: 5_000 },
  { mode: 1, durationMs: Number.POSITIVE_INFINITY },
];

export function ghostSpeedLevelMul(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return 1 + 0.05 * (level - 1);
}

export function ghostKindsForLevel(
  levelIndex: number,
  secondGhostKind: GhostKindId,
): GhostKindId[] {
  const level = Math.max(1, levelIndex);
  if (level === 1) {
    return [GHOST_KIND.blinky];
  }
  if (level === 2) {
    return [GHOST_KIND.blinky, secondGhostKind];
  }
  return [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde];
}

export function ghostModeWavesForLevel(levelIndex: number): readonly GhostModeWave[] {
  const level = Math.max(1, levelIndex);
  return level <= 1 ? CHASE_ONLY_WAVES : ARCADE_WAVES;
}

export function ghostModeStartWaveIndex(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return level <= 1 ? 0 : 1;
}
