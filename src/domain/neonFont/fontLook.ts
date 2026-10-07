import type { Tuning } from "../tuning";

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

export function fontLineArtLook(tuning: Tuning): FontLineArtLook {
  return {
    thickness: tuning.fontThickness,
    glow:
      tuning.fontBloom <= 0 || tuning.fontBloomRadius <= 0
        ? null
        : { outerStrength: tuning.fontBloom, distancePx: tuning.fontBloomRadius },
    glowColor: tuning.fontGlowColor,
    letterSpacing: tuning.fontLetterSpacing,
    heightScale: tuning.fontHeightScale,
    glowKnockout: tuning.fontGlowKnockout,
  };
}
