import type { Tuning } from "../tuning";

export type FontGlow = { outerStrength: number; distancePx: number };

export type FontLineArtLook = {
  /** Stroke width as a fraction of the glyph viewBox height (fontSize mapping). */
  thickness: number;
  glow: FontGlow | null;
  coreColor: number | null;
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
    coreColor: null,
    glowColor: tuning.fontGlowColor,
    letterSpacing: tuning.fontLetterSpacing,
    heightScale: tuning.fontHeightScale,
    glowKnockout: tuning.fontGlowKnockout,
  };
}

export function sameFontLook(a: FontLineArtLook, b: FontLineArtLook): boolean {
  return (
    a.thickness === b.thickness &&
    a.glow?.outerStrength === b.glow?.outerStrength &&
    a.glow?.distancePx === b.glow?.distancePx &&
    a.coreColor === b.coreColor &&
    a.glowColor === b.glowColor &&
    a.letterSpacing === b.letterSpacing &&
    a.heightScale === b.heightScale &&
    a.glowKnockout === b.glowKnockout
  );
}
