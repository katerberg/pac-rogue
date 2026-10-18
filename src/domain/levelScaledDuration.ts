export const INVULN_FLOOR_RATIO = 3 / 4;

export function levelScaledDurationMs(
  baseMs: number,
  levelIndex: number,
  floorRatio = 2 / 3,
): number {
  const minMs = Math.floor(baseMs * floorRatio);
  const stepMs = Math.ceil((baseMs - minMs) / 4);
  const shortened = baseMs - stepMs * (Math.max(1, levelIndex) - 1);
  return Math.max(minMs, shortened);
}
