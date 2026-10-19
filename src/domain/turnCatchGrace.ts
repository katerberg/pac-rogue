/** Silent catch skip after a perpendicular turn so a faster ghost cannot kill on the corner. */
export const TURN_CATCH_GRACE_MS = 200;

export function tickTurnCatchGrace(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}

export function startTurnCatchGrace(remainingMs = 0): number {
  return Math.max(remainingMs, TURN_CATCH_GRACE_MS);
}

export function turnCatchGraceActive(remainingMs: number): boolean {
  return remainingMs > 0;
}
