import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS, WALL_STROKE_WEIGHT } from "./maze";
import { mazeColorForIndex } from "./mazeColorSettings";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export type WallStyle = {
  color: number;
  thickness: number;
  glow: number;
  glowRadius: number;
  cornerRadius: number;
  background: number;
};

export const WALL_GLOW_MAX_OUTER = 4;

export function wallStyleFor(tuning: Tuning | null, mazeColorIndex: number): WallStyle {
  if (tuning === null) {
    return {
      color: mazeColorForIndex(mazeColorIndex),
      thickness: WALL_STROKE_WEIGHT,
      glow: DEFAULT_TUNING.wallGlow,
      glowRadius: DEFAULT_TUNING.wallGlowRadius,
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

// distance is in world px; the renderer scales it to device px.
export function wallGlowFilter(
  style: WallStyle,
): { outerStrength: number; distance: number } | null {
  if (style.glow <= 0 || style.glowRadius <= 0) {
    return null;
  }
  return { outerStrength: style.glow * WALL_GLOW_MAX_OUTER, distance: style.glowRadius };
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
