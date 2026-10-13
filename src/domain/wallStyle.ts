import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS } from "./maze";
import { mazeColorForIndex } from "./mazeColorSettings";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export type WallStyle = {
  color: number;
  thickness: number;
  cornerRadius: number;
  background: number;
};

export function wallStyleFor(tuning: Tuning | null, mazeColorIndex: number): WallStyle {
  if (tuning === null) {
    return {
      color: mazeColorForIndex(mazeColorIndex),
      thickness: DEFAULT_TUNING.wallThickness,
      cornerRadius: WALL_CORNER_RADIUS,
      background: MAZE_BACKGROUND_COLOR,
    };
  }
  return {
    color: tuning.wallColor,
    thickness: tuning.wallThickness,
    cornerRadius: tuning.wallCornerRadius,
    background: tuning.backgroundColor,
  };
}

export function sameWallStyle(a: WallStyle | null, b: WallStyle | null): boolean {
  return (
    a !== null &&
    b !== null &&
    a.color === b.color &&
    a.thickness === b.thickness &&
    a.cornerRadius === b.cornerRadius &&
    a.background === b.background
  );
}
