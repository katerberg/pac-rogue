import { GHOST_DIR, type GhostDir } from "./ghostPath";

export const GHOST_PUPIL_COLOR = 0x000000;
export const GHOST_PUPIL_ART_PX = 2;
export const GHOST_ART_SIZE_PX = 16;
/** Art-space top-lefts matching the former baked 2×2 pupils — do not drift without retuning art. */
export const GHOST_PUPIL_REST_ART = [
  { x: 4, y: 6 },
  { x: 10, y: 6 },
] as const;
export const GHOST_PUPIL_LOOK_OFFSET_ART = 1;

export type PupilRect = { x: number; y: number; w: number; h: number };

export type GhostPupilDrawKind = "primary" | "afterimage";

export function ghostPupilsVisible(args: {
  inFrightenedSet: boolean;
  drawKind: GhostPupilDrawKind;
}): boolean {
  return args.drawKind === "primary" && !args.inFrightenedSet;
}

export function ghostPupilLookOffset(facing: GhostDir): { dx: number; dy: number } {
  switch (facing) {
    case GHOST_DIR.up:
      return { dx: 0, dy: -GHOST_PUPIL_LOOK_OFFSET_ART };
    case GHOST_DIR.down:
      return { dx: 0, dy: GHOST_PUPIL_LOOK_OFFSET_ART };
    case GHOST_DIR.left:
      return { dx: -GHOST_PUPIL_LOOK_OFFSET_ART, dy: 0 };
    case GHOST_DIR.right:
      return { dx: GHOST_PUPIL_LOOK_OFFSET_ART, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

export type PupilLook = { dx: number; dy: number };

const BLINKY_EYES_TRACK_FROM_LEVEL = 4;

export function blinkyEyesTrackPlayer(level: number): boolean {
  return level >= BLINKY_EYES_TRACK_FROM_LEVEL;
}

export function ghostPupilLookToward(dx: number, dy: number): PupilLook {
  const dist = Math.hypot(dx, dy);
  if (dist === 0) {
    return { dx: 0, dy: 0 };
  }
  return {
    dx: (dx / dist) * GHOST_PUPIL_LOOK_OFFSET_ART,
    dy: (dy / dist) * GHOST_PUPIL_LOOK_OFFSET_ART,
  };
}

export type PupilLookState = { from: PupilLook; to: PupilLook; startMs: number };

export const GHOST_PUPIL_TURN_MS = 250;

function currentLook(state: PupilLookState, nowMs: number): PupilLook {
  const t = Math.min(1, Math.max(0, (nowMs - state.startMs) / GHOST_PUPIL_TURN_MS));
  const eased = t * t * (3 - 2 * t);
  return {
    dx: state.from.dx + (state.to.dx - state.from.dx) * eased,
    dy: state.from.dy + (state.to.dy - state.from.dy) * eased,
  };
}

export function stepGhostPupilLook(
  prev: PupilLookState | undefined,
  facing: GhostDir,
  nowMs: number,
): { state: PupilLookState; look: PupilLook } {
  const target = ghostPupilLookOffset(facing);
  if (prev === undefined) {
    return { state: { from: target, to: target, startMs: nowMs }, look: target };
  }
  const state =
    prev.to.dx === target.dx && prev.to.dy === target.dy
      ? prev
      : { from: currentLook(prev, nowMs), to: target, startMs: nowMs };
  return { state, look: currentLook(state, nowMs) };
}

export function ghostPupilRects(
  cx: number,
  cy: number,
  displaySize: number,
  look: PupilLook,
): PupilRect[] {
  const scale = displaySize / GHOST_ART_SIZE_PX;
  const { dx, dy } = look;
  const w = GHOST_PUPIL_ART_PX * scale;
  const h = GHOST_PUPIL_ART_PX * scale;
  const half = displaySize / 2;
  return GHOST_PUPIL_REST_ART.map((rest) => ({
    x: cx - half + (rest.x + dx) * scale,
    y: cy - half + (rest.y + dy) * scale,
    w,
    h,
  }));
}
