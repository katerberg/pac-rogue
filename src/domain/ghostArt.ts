import type { GhostKindId } from "./ghostKind";
import { GHOST_DRAWABLE_BY_KIND, PLAYER_DRAWABLE_ID } from "./playfield";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export type GhostStyle = "neon" | "lined" | "pixel";

export const DEFAULT_GHOST_STYLE: GhostStyle = "neon";

export function parseGhostStyle(raw: string | null): GhostStyle {
  return raw === "neon" || raw === "lined" || raw === "pixel" ? raw : DEFAULT_GHOST_STYLE;
}

/** Soft glow on walls, ghosts, pellets, and UI neon-font bloom when knobs are off. Neon only. */
export function styleUsesGlow(style: GhostStyle): boolean {
  return style === "neon";
}

/** Which typeface UI text uses for a given Settings STYLE. */
export function textStyleFor(style: GhostStyle): "neon" | "pixel" {
  return style === "pixel" ? "pixel" : "neon";
}

export function lineArtGhostKinds(
  style: GhostStyle,
  presentKinds: Iterable<GhostKindId>,
): GhostKindId[] {
  return style === "pixel" ? [] : [...new Set(presentKinds)];
}

export function lineArtPlayer(style: GhostStyle): boolean {
  return style !== "pixel";
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

/**
 * Line-art look from knobs (`tuning !== null`, STYLE ignored) or from STYLE when
 * knobs are off (`tuning === null`): neon keeps default glow, lined/pixel force none.
 */
export function ghostLineArtLook(
  tuning: Tuning | null,
  style: GhostStyle = DEFAULT_GHOST_STYLE,
): GhostLineArtLook {
  const t = tuning ?? DEFAULT_TUNING;
  const allowGlow = tuning !== null || styleUsesGlow(style);
  return {
    glow:
      !allowGlow || t.ghostGlow <= 0 || t.ghostGlowRadius <= 0
        ? null
        : { outerStrength: t.ghostGlow, distancePx: t.ghostGlowRadius },
    lineWidth: t.ghostLineWidth / 100,
    widthScale: t.ghostWidth,
    heightScale: t.ghostHeight,
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
