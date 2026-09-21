import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { GhostModeWave } from "./ghostMode";

const GHOST_UNLOCK_ORDER: readonly GhostKindId[] = [
  GHOST_KIND.blinky,
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.clyde,
];

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
  return 1 + 0.1 * (level - 1);
}

export function ghostKindsForLevel(levelIndex: number): GhostKindId[] {
  const level = Math.max(1, levelIndex);
  const count = Math.min(level, GHOST_UNLOCK_ORDER.length);
  return GHOST_UNLOCK_ORDER.slice(0, count);
}

export function ghostModeWavesForLevel(levelIndex: number): readonly GhostModeWave[] {
  const level = Math.max(1, levelIndex);
  return level <= 1 ? CHASE_ONLY_WAVES : ARCADE_WAVES;
}

export function ghostModeStartWaveIndex(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return level <= 1 ? 0 : 1;
}
