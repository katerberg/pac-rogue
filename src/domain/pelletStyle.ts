import { DEFAULT_GHOST_STYLE, type GhostStyle } from "./ghostArt";
import { LAZY_LOOPER_OPTIONAL_TINT } from "./lazyLooper";
import { mazeColorForIndex } from "./mazeColorSettings";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export type PelletKindLook = {
  radius: number;
  strokeWidth: number;
  coreColor: number;
  glow: number;
  glowRadius: number;
  glowColor: number;
  fillColor: number;
  fillOpacity: number;
};

export type PelletStyle = {
  regular: PelletKindLook;
  power: PelletKindLook;
  boss: PelletKindLook;
  optional: PelletKindLook;
};

function kindLook(partial: PelletKindLook): PelletKindLook {
  return partial;
}

function fromTuning(tuning: Tuning, mazeGlowColor: number): PelletStyle {
  const core = tuning.pelletCoreColor;
  return {
    regular: kindLook({
      radius: tuning.pelletRadius,
      strokeWidth: tuning.pelletStrokeWidth,
      coreColor: core,
      glow: tuning.pelletGlow,
      glowRadius: tuning.pelletGlowRadius,
      glowColor: mazeGlowColor,
      fillColor: core,
      fillOpacity: tuning.pelletFillOpacity,
    }),
    power: kindLook({
      radius: tuning.powerPelletRadius,
      strokeWidth: tuning.powerPelletStrokeWidth,
      coreColor: core,
      glow: tuning.powerPelletGlow,
      glowRadius: tuning.powerPelletGlowRadius,
      glowColor: mazeGlowColor,
      fillColor: core,
      fillOpacity: tuning.powerPelletFillOpacity,
    }),
    boss: kindLook({
      radius: tuning.bossPelletRadius,
      strokeWidth: tuning.bossPelletStrokeWidth,
      coreColor: core,
      glow: tuning.bossPelletGlow,
      glowRadius: tuning.bossPelletGlowRadius,
      glowColor: mazeGlowColor,
      fillColor: core,
      fillOpacity: tuning.bossPelletFillOpacity,
    }),
    optional: kindLook({
      radius: tuning.optionalPelletRadius,
      strokeWidth: tuning.optionalPelletStrokeWidth,
      coreColor: tuning.optionalPelletFillColor,
      glow: tuning.optionalPelletGlow,
      glowRadius: tuning.optionalPelletGlowRadius,
      glowColor: tuning.optionalPelletGlowColor,
      fillColor: tuning.optionalPelletFillColor,
      fillOpacity: tuning.optionalPelletFillOpacity,
    }),
  };
}

export function pelletStyleFor(
  tuning: Tuning | null,
  mazeColorIndex: number,
  style: GhostStyle = DEFAULT_GHOST_STYLE,
): PelletStyle | null {
  if (tuning !== null) {
    return fromTuning(tuning, tuning.pelletGlowColor);
  }
  if (style !== "neon") {
    return null;
  }
  return fromTuning(DEFAULT_TUNING, mazeColorForIndex(mazeColorIndex));
}

export function pelletGlowFilter(
  look: PelletKindLook,
): { outerStrength: number; distance: number } | null {
  if (look.glow <= 0 || look.glowRadius <= 0) {
    return null;
  }
  return { outerStrength: look.glow, distance: look.glowRadius };
}

function sameKind(a: PelletKindLook, b: PelletKindLook): boolean {
  return (
    a.radius === b.radius &&
    a.strokeWidth === b.strokeWidth &&
    a.coreColor === b.coreColor &&
    a.glow === b.glow &&
    a.glowRadius === b.glowRadius &&
    a.glowColor === b.glowColor &&
    a.fillColor === b.fillColor &&
    a.fillOpacity === b.fillOpacity
  );
}

export function samePelletStyle(a: PelletStyle | null, b: PelletStyle | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    sameKind(a.regular, b.regular) &&
    sameKind(a.power, b.power) &&
    sameKind(a.boss, b.boss) &&
    sameKind(a.optional, b.optional)
  );
}

export const OPTIONAL_PELLET_DEFAULT_FILL = LAZY_LOOPER_OPTIONAL_TINT;
