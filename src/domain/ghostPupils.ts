import type { GhostStyle } from "./ghostArt";
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
  style: GhostStyle;
  inFrightenedSet: boolean;
  drawKind: GhostPupilDrawKind;
}): boolean {
  return args.style === "pixel" && args.drawKind === "primary" && !args.inFrightenedSet;
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

export function ghostPupilRects(
  cx: number,
  cy: number,
  displaySize: number,
  facing: GhostDir,
): PupilRect[] {
  const scale = displaySize / GHOST_ART_SIZE_PX;
  const { dx, dy } = ghostPupilLookOffset(facing);
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
