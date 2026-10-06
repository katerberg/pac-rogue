import type { GhostKindId } from "./ghostKind";
import type { Tuning } from "./tuning";

export type GhostStyle = "neon" | "pixel";

export const DEFAULT_GHOST_STYLE: GhostStyle = "neon";

export function parseGhostStyle(raw: string | null): GhostStyle {
  return raw === "neon" || raw === "pixel" ? raw : DEFAULT_GHOST_STYLE;
}

/** Which typeface UI text uses for a given Settings STYLE. */
export function textStyleFor(style: GhostStyle): "neon" | "pixel" {
  return style;
}

export function lineArtGhostKinds(
  style: GhostStyle,
  presentKinds: Iterable<GhostKindId>,
): GhostKindId[] {
  return style === "neon" ? [...new Set(presentKinds)] : [];
}

export type GhostGlow = { outerStrength: number; distancePx: number };

export type GhostLineArtLook = {
  glow: GhostGlow | null;
  /** Stroke width as a fraction of the art's viewBox width. */
  lineWidth: number;
  /** Horizontal and vertical stretch of the geometry (stroke width unchanged). */
  widthScale: number;
  heightScale: number;
};

export function ghostLineArtLook(tuning: Tuning): GhostLineArtLook {
  return {
    glow:
      tuning.ghostGlow <= 0 || tuning.ghostGlowRadius <= 0
        ? null
        : { outerStrength: tuning.ghostGlow, distancePx: tuning.ghostGlowRadius },
    lineWidth: tuning.ghostLineWidth / 100,
    widthScale: tuning.ghostWidth,
    heightScale: tuning.ghostHeight,
  };
}

export function sameGhostLineArtLook(a: GhostLineArtLook, b: GhostLineArtLook): boolean {
  return (
    a.glow?.outerStrength === b.glow?.outerStrength &&
    a.glow?.distancePx === b.glow?.distancePx &&
    a.lineWidth === b.lineWidth &&
    a.widthScale === b.widthScale &&
    a.heightScale === b.heightScale
  );
}
