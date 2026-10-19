/** Silent catch skip after a perpendicular turn so a faster ghost cannot kill on the corner. */
export const TURN_CATCH_GRACE_MS = 200;

export function tickTurnCatchGrace(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}
