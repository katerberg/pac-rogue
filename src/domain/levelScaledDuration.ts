/** Shortens a power-pellet duration from L1 full to a ⅔ floor by L5. */
export function levelScaledDurationMs(baseMs: number, levelIndex: number): number {
  const minMs = Math.floor((baseMs * 2) / 3);
  const stepMs = Math.ceil((baseMs - minMs) / 4);
  const shortened = baseMs - stepMs * (Math.max(1, levelIndex) - 1);
  return Math.max(minMs, shortened);
}
