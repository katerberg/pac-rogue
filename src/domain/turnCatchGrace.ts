export const TURN_CATCH_GRACE_MS = 200;

export function tickTurnCatchGrace(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}
