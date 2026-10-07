import { fitFontSizeFloor, NEON_FIT_CELL_PX, type TextStyle } from "./neonFont/textStack";

const PIXEL_GLYPH_PX = 8;

export function fitFontSize(
  text: string,
  maxWidth: number,
  preferredSize: number,
  textStyle: TextStyle = "pixel",
): number {
  const longestWord = Math.max(1, ...text.split(/\s+/).map((word) => word.length));
  const cell = textStyle === "neon" ? NEON_FIT_CELL_PX : PIXEL_GLYPH_PX;
  const fitting = Math.floor(maxWidth / longestWord / cell) * cell;
  const floor = textStyle === "neon" ? fitFontSizeFloor(preferredSize) : PIXEL_GLYPH_PX;
  return Math.max(floor, Math.min(preferredSize, fitting));
}
