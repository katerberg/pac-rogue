import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { GHOST_AI_MODE, type GhostModeWave } from "./ghostMode";

const GHOST_UNLOCK_ORDER: readonly GhostKindId[] = [
  GHOST_KIND.blinky,
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.clyde,
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
  if (level <= 1) {
    return [{ mode: GHOST_AI_MODE.chase, durationMs: Number.POSITIVE_INFINITY }];
  }
  return [
    { mode: GHOST_AI_MODE.scatter, durationMs: 7_000 },
    { mode: GHOST_AI_MODE.chase, durationMs: 20_000 },
    { mode: GHOST_AI_MODE.scatter, durationMs: 7_000 },
    { mode: GHOST_AI_MODE.chase, durationMs: 20_000 },
    { mode: GHOST_AI_MODE.scatter, durationMs: 5_000 },
    { mode: GHOST_AI_MODE.chase, durationMs: 20_000 },
    { mode: GHOST_AI_MODE.scatter, durationMs: 5_000 },
    { mode: GHOST_AI_MODE.chase, durationMs: Number.POSITIVE_INFINITY },
  ];
}

/** Level 1 is chase-only (index 0). Level 2+ skips the opening arcade scatter. */
export function ghostModeStartWaveIndex(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return level <= 1 ? 0 : 1;
}
