import { GHOST_KIND, type GhostKindId } from "./ghostKind";

/** Classic arcade unlock order: one new ghost per level through level 4. */
export const GHOST_UNLOCK_ORDER: readonly GhostKindId[] = [
  GHOST_KIND.blinky,
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.clyde,
];

export function parseLevelParam(params: URLSearchParams): number | null {
  const raw = params.get("level");
  if (raw === null || raw === "" || !/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (value < 1) {
    return null;
  }
  return value;
}

export function ghostSpeedLevelMul(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return 1 + 0.1 * (level - 1);
}

export function ghostKindsForLevel(levelIndex: number): GhostKindId[] {
  const level = Math.max(1, levelIndex);
  const count = Math.min(level, GHOST_UNLOCK_ORDER.length);
  return GHOST_UNLOCK_ORDER.slice(0, count);
}
