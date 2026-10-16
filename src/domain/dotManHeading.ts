export const DOTMAN_TURN_MS = 90;

const HALF_TURN = Math.PI;
const FULL_TURN = Math.PI * 2;

export type HeadingStep = "up" | "down" | "left" | "right";

export function headingAngle(step: HeadingStep): number {
  switch (step) {
    case "right":
      return 0;
    case "down":
      return Math.PI / 2;
    case "left":
      return Math.PI;
    case "up":
      return -Math.PI / 2;
  }
}

function shortestDelta(from: number, to: number): number {
  const wrapped = (((to - from + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return wrapped - HALF_TURN;
}

export function stepHeading(current: number, target: number, dtMs: number): number {
  const delta = shortestDelta(current, target);
  const maxStep = (HALF_TURN / 2) * (Math.max(dtMs, 0) / DOTMAN_TURN_MS);
  if (Math.abs(delta) <= maxStep) {
    return current + delta;
  }
  return current + Math.sign(delta) * maxStep;
}

export type VisorPose = { rotation: number; flipX: boolean };

/**
 * Pose for the right-facing visor art at a heading angle. Leftward headings mirror the
 * art instead of rotating it past vertical, so the visor stays upright and bobs up.
 */
export function visorPose(angle: number): VisorPose {
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (Math.cos(wrapped) >= -1e-6) {
    return { rotation: wrapped, flipX: false };
  }
  return { rotation: wrapped > 0 ? wrapped - HALF_TURN : wrapped + HALF_TURN, flipX: true };
}
