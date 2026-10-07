import { DEFAULT_GHOST_STYLE, styleUsesGlow, type GhostStyle } from "../ghostArt";
import { DEFAULT_TUNING, type Tuning } from "../tuning";

export type FontGlow = { outerStrength: number; distancePx: number };

export type FontLineArtLook = {
  /** Stroke width in glyph grid cells (one cell = fontSize / NEON_GLYPH_HEIGHT). */
  thickness: number;
  glow: FontGlow | null;
  glowColor: number;
  letterSpacing: number;
  heightScale: number;
  glowKnockout: boolean;
};

export function fontLineArtLook(
  tuning: Tuning | null,
  style: GhostStyle = DEFAULT_GHOST_STYLE,
): FontLineArtLook {
  const t = tuning ?? DEFAULT_TUNING;
  const allowGlow = tuning !== null || styleUsesGlow(style);
  return {
    thickness: t.fontThickness,
    glow:
      !allowGlow || t.fontBloom <= 0 || t.fontBloomRadius <= 0
        ? null
        : { outerStrength: t.fontBloom, distancePx: t.fontBloomRadius },
    glowColor: t.fontGlowColor,
    letterSpacing: t.fontLetterSpacing,
    heightScale: t.fontHeightScale,
    glowKnockout: t.fontGlowKnockout,
  };
}

export function neonFontGlowSourceWidthPx(sourceStrokePx: number): number {
  return Math.max(0.5, sourceStrokePx - Math.min(2, sourceStrokePx * 0.5));
}

export function fontLookWithoutBloom(look: FontLineArtLook): FontLineArtLook {
  return look.glow === null ? look : { ...look, glow: null };
}
