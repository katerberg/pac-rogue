import { DEFAULT_GHOST_STYLE, type GhostStyle } from "./ghostArt";
import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS } from "./maze";
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

export function wallStyleFor(
  tuning: Tuning | null,
  mazeColorIndex: number,
  style: GhostStyle = DEFAULT_GHOST_STYLE,
): WallStyle {
  if (tuning === null) {
    const neon = style === "neon";
    return {
      color: mazeColorForIndex(mazeColorIndex),
      thickness: DEFAULT_TUNING.wallThickness,
      glow: neon ? DEFAULT_TUNING.wallGlow : 0,
      glowRadius: neon ? DEFAULT_TUNING.wallGlowRadius : 0,
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

export function wallGlowFilter(
  style: WallStyle,
): { outerStrength: number; distance: number } | null {
  if (style.glow <= 0 || style.glowRadius <= 0) {
    return null;
  }
  return { outerStrength: style.glow, distance: style.glowRadius };
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
