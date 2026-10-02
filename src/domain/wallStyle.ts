import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS, WALL_STROKE_WEIGHT } from "./maze";
import { mazeColorForIndex } from "./mazeColorSettings";
import type { Tuning } from "./tuning";

export type WallStyle = {
  color: number;
  thickness: number;
  glow: number;
  glowRadius: number;
  cornerRadius: number;
  background: number;
};

type GlowLayer = { width: number; alpha: number };

const GLOW_LAYER_COUNT = 4;
const GLOW_MAX_ALPHA = 0.35;

export function wallStyleFor(tuning: Tuning | null, mazeColorIndex: number): WallStyle {
  if (tuning === null) {
    return {
      color: mazeColorForIndex(mazeColorIndex),
      thickness: WALL_STROKE_WEIGHT,
      glow: 0,
      glowRadius: 0,
      cornerRadius: WALL_CORNER_RADIUS,
      background: MAZE_BACKGROUND_COLOR,
    };
  }
  return {
    color: tuning.wallColor,
    thickness: tuning.wallThickness,
    glow: tuning.wallGlow,
    glowRadius: tuning.wallGlowRadius,
    cornerRadius: tuning.wallCornerRadius,
    background: tuning.backgroundColor,
  };
}

export function wallGlowLayers(style: WallStyle): GlowLayer[] {
  if (style.glow <= 0 || style.glowRadius <= 0) {
    return [];
  }
  const layers: GlowLayer[] = [];
  for (let i = GLOW_LAYER_COUNT; i >= 1; i -= 1) {
    layers.push({
      width: style.thickness + (2 * style.glowRadius * i) / GLOW_LAYER_COUNT,
      alpha: style.glow * GLOW_MAX_ALPHA * (1 - (i - 1) / GLOW_LAYER_COUNT),
    });
  }
  return layers;
}

export function sameWallStyle(a: WallStyle | null, b: WallStyle | null): boolean {
  return (
    a !== null &&
    b !== null &&
    a.color === b.color &&
    a.thickness === b.thickness &&
    a.glow === b.glow &&
    a.glowRadius === b.glowRadius &&
    a.cornerRadius === b.cornerRadius &&
    a.background === b.background
  );
}
