import type { GhostKindId } from "./ghostKind";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export type GhostStyle = "neon" | "lined" | "pixel";

export const DEFAULT_GHOST_STYLE: GhostStyle = "neon";

export function parseGhostStyle(raw: string | null): GhostStyle {
  return raw === "neon" || raw === "lined" || raw === "pixel" ? raw : DEFAULT_GHOST_STYLE;
}

/** Soft glow on walls, ghosts, and pellets when knobs are off. Neon only. */
export function styleUsesGlow(style: GhostStyle): boolean {
  return style === "neon";
}

export function lineArtGhostKinds(
  style: GhostStyle,
  presentKinds: Iterable<GhostKindId>,
): GhostKindId[] {
  return style === "pixel" ? [] : [...new Set(presentKinds)];
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

export function sameGhostLineArtLook(a: GhostLineArtLook, b: GhostLineArtLook): boolean {
  return (
    a.glow?.outerStrength === b.glow?.outerStrength &&
    a.glow?.distancePx === b.glow?.distancePx &&
    a.lineWidth === b.lineWidth &&
    a.widthScale === b.widthScale &&
    a.heightScale === b.heightScale
  );
}
