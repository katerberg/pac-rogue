import type { GhostKindId } from "./ghostKind";
import { GHOST_DRAWABLE_BY_KIND, PLAYER_DRAWABLE_ID } from "./playfield";
import type { Tuning } from "./tuning";

export type GhostStyle = "neon" | "pixel";

export const DEFAULT_GHOST_STYLE: GhostStyle = "neon";

export function parseGhostStyle(raw: string | null): GhostStyle {
  return raw === "neon" || raw === "pixel" ? raw : DEFAULT_GHOST_STYLE;
}

export function lineArtGhostKinds(
  style: GhostStyle,
  presentKinds: Iterable<GhostKindId>,
): GhostKindId[] {
  return style === "neon" ? [...new Set(presentKinds)] : [];
}

export function lineArtPlayer(style: GhostStyle): boolean {
  return style === "neon";
}

export function lineArtDrawableIds(
  style: GhostStyle,
  presentKinds: Iterable<GhostKindId>,
): string[] {
  return [
    ...(lineArtPlayer(style) ? [PLAYER_DRAWABLE_ID] : []),
    ...lineArtGhostKinds(style, presentKinds).map((kind) => GHOST_DRAWABLE_BY_KIND[kind]),
  ];
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

export const PLAYER_LINE_WIDTH = 0.065;

export function playerLineArtLook(ghostLook: GhostLineArtLook): GhostLineArtLook {
  return { ...ghostLook, lineWidth: PLAYER_LINE_WIDTH, widthScale: 1, heightScale: 1 };
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
