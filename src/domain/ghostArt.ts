import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { Tuning } from "./tuning";

export type GhostArtStyle = "pixel" | "line";

export const LINE_ART_CLYDE_LEVELS = { first: 5, last: 8 } as const;

export function ghostArtStyle(kind: GhostKindId, levelIndex: number): GhostArtStyle {
  return kind === GHOST_KIND.clyde &&
    levelIndex >= LINE_ART_CLYDE_LEVELS.first &&
    levelIndex <= LINE_ART_CLYDE_LEVELS.last
    ? "line"
    : "pixel";
}

export type GhostGlow = { outerStrength: number; distancePx: number };

export type GhostLineArtLook = {
  glow: GhostGlow | null;
  /** Stroke width as a fraction of the art's viewBox width. */
  lineWidth: number;
  /** Horizontal stretch of the geometry (stroke width unchanged). */
  widthScale: number;
};

export function ghostLineArtLook(tuning: Tuning): GhostLineArtLook {
  return {
    glow:
      tuning.ghostGlow <= 0 || tuning.ghostGlowRadius <= 0
        ? null
        : { outerStrength: tuning.ghostGlow, distancePx: tuning.ghostGlowRadius },
    lineWidth: tuning.ghostLineWidth / 100,
    widthScale: tuning.ghostWidth,
  };
}

export function sameGhostLineArtLook(a: GhostLineArtLook, b: GhostLineArtLook): boolean {
  return (
    a.glow?.outerStrength === b.glow?.outerStrength &&
    a.glow?.distancePx === b.glow?.distancePx &&
    a.lineWidth === b.lineWidth &&
    a.widthScale === b.widthScale
  );
}
