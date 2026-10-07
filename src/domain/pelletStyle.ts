import { DEFAULT_GHOST_STYLE, styleUsesGlow, type GhostStyle } from "./ghostArt";
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

function fromTuning(tuning: Tuning, mazeGlowColor: number): PelletStyle {
  const core = tuning.pelletCoreColor;
  return {
    regular: {
      radius: tuning.pelletRadius,
      strokeWidth: tuning.pelletStrokeWidth,
      coreColor: core,
      glow: tuning.pelletGlow,
      glowRadius: tuning.pelletGlowRadius,
      glowColor: mazeGlowColor,
      fillColor: core,
      fillOpacity: tuning.pelletFillOpacity,
    },
    power: {
      radius: tuning.powerPelletRadius,
      strokeWidth: tuning.powerPelletStrokeWidth,
      coreColor: core,
      glow: tuning.powerPelletGlow,
      glowRadius: tuning.powerPelletGlowRadius,
      glowColor: mazeGlowColor,
      fillColor: core,
      fillOpacity: tuning.powerPelletFillOpacity,
    },
    boss: {
      radius: tuning.bossPelletRadius,
      strokeWidth: tuning.bossPelletStrokeWidth,
      coreColor: core,
      glow: tuning.bossPelletGlow,
      glowRadius: tuning.bossPelletGlowRadius,
      glowColor: mazeGlowColor,
      fillColor: core,
      fillOpacity: tuning.bossPelletFillOpacity,
    },
    optional: {
      radius: tuning.optionalPelletRadius,
      strokeWidth: tuning.optionalPelletStrokeWidth,
      coreColor: tuning.optionalPelletFillColor,
      glow: tuning.optionalPelletGlow,
      glowRadius: tuning.optionalPelletGlowRadius,
      glowColor: tuning.optionalPelletGlowColor,
      fillColor: tuning.optionalPelletFillColor,
      fillOpacity: tuning.optionalPelletFillOpacity,
    },
  };
}

function withoutGlow(style: PelletStyle): PelletStyle {
  const zero = (look: PelletKindLook): PelletKindLook => ({ ...look, glow: 0, glowRadius: 0 });
  return {
    regular: zero(style.regular),
    power: zero(style.power),
    boss: zero(style.boss),
    optional: zero(style.optional),
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
  if (style === "pixel") {
    return null;
  }
  const neon = fromTuning(DEFAULT_TUNING, mazeColorForIndex(mazeColorIndex));
  return styleUsesGlow(style) ? neon : withoutGlow(neon);
}

export function pelletGlowFilter(
  look: PelletKindLook,
): { outerStrength: number; distance: number } | null {
  if (look.glow <= 0 || look.glowRadius <= 0) {
    return null;
  }
  return { outerStrength: look.glow, distance: look.glowRadius };
}

/**
 * Knockout glow emits outside the opaque source. Match a filled disc inset
 * under the crisp edge so bloom starts at/inside the white (no dark gap).
 * Crisp fill stays on the separate Graphics layer.
 */
const PELLET_GLOW_SOURCE_INSET = 0.25;

export function pelletGlowSourceLook(look: PelletKindLook): PelletKindLook {
  return {
    ...look,
    radius: Math.max(0.25, look.radius - PELLET_GLOW_SOURCE_INSET),
    strokeWidth: 0,
    fillOpacity: 1,
  };
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
