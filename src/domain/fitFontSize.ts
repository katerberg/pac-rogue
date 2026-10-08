import {
  fitFontSizeFloor,
  lineWidthPx,
  NEON_FIT_CELL_PX,
  type TextStyle,
} from "./neonFont/textStack";
import { DEFAULT_TUNING } from "./tuning";

const PIXEL_GLYPH_PX = 8;

export function fitFontSize(
  text: string,
  maxWidth: number,
  preferredSize: number,
  textStyle: TextStyle = "pixel",
): number {
  if (textStyle !== "neon") {
    const longestWord = Math.max(1, ...text.split(/\s+/).map((word) => word.length));
    const fitting = Math.floor(maxWidth / longestWord / PIXEL_GLYPH_PX) * PIXEL_GLYPH_PX;
    return Math.max(PIXEL_GLYPH_PX, Math.min(preferredSize, fitting));
  }

  const floor = fitFontSizeFloor(preferredSize);
  const { fontThickness, fontLetterSpacing } = DEFAULT_TUNING;
  const lines = text.split("\n");
  let size = preferredSize;
  while (size > floor) {
    const fits = lines.every(
      (line) => lineWidthPx(line, size, "neon", fontThickness, fontLetterSpacing) <= maxWidth,
    );
    if (fits) {
      return size;
    }
    size -= NEON_FIT_CELL_PX;
  }
  return floor;
}
