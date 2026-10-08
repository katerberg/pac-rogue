import { wrapText } from "../wrapText";
import { NEON_GLYPH_HEIGHT } from "./glyphGrammar";
import { neonDisplayText, neonLineAdvance } from "./layout";

const NEON_WRAP_CHAR_MUL = 1.75;

const NEON_INTER_ROW_GAP_MUL = 1.5;

export const NEON_FIT_CELL_PX = 4;

export type TextStyle = "neon" | "pixel";

export function wrapCharBudget(pixelBudget: number, textStyle: TextStyle): number {
  return textStyle === "neon" ? Math.round(pixelBudget * NEON_WRAP_CHAR_MUL) : pixelBudget;
}

export function wrapCharsForBox(
  boxWidthPx: number,
  fontSize: number,
  textStyle: TextStyle,
  sidePadPx: number,
): number {
  const inner = Math.max(1, boxWidthPx - 2 * sidePadPx);
  const charPx = textStyle === "neon" ? (fontSize * NEON_FIT_CELL_PX) / 8 : Math.max(1, fontSize);
  return Math.max(1, Math.floor(inner / charPx));
}

export function lineWidthPx(
  line: string,
  fontSize: number,
  textStyle: TextStyle,
  thickness: number,
  letterSpacing: number,
): number {
  if (textStyle === "pixel") {
    return line.length * fontSize;
  }
  // NeonText uppercases before draw; measure the glyphs that actually appear.
  return (
    neonLineAdvance(neonDisplayText(line), thickness, letterSpacing) *
    (fontSize / NEON_GLYPH_HEIGHT)
  );
}

export function interTextGap(baseGapPx: number, textStyle: TextStyle): number {
  return textStyle === "neon" ? Math.round(baseGapPx * NEON_INTER_ROW_GAP_MUL) : baseGapPx;
}

export function fitFontSizeFloor(preferredSize: number): number {
  return preferredSize >= 22 ? 16 : 8;
}

export function stackRowTopsFromTop(
  heights: readonly number[],
  gapsBelow: readonly number[],
  topY: number,
): number[] {
  let top = topY;
  const tops: number[] = [];
  for (let i = 0; i < heights.length; i += 1) {
    tops.push(top);
    top += heights[i]! + (gapsBelow[i] ?? 0);
  }
  return tops;
}

export function stackRowTops(
  heights: readonly number[],
  gapsBelow: readonly number[],
  centerY: number,
): number[] {
  let total = 0;
  for (let i = 0; i < heights.length; i += 1) {
    total += heights[i]! + (gapsBelow[i] ?? 0);
  }
  return stackRowTopsFromTop(heights, gapsBelow, centerY - total / 2);
}

export function wrapCharsFittingWidth(
  text: string,
  boxWidthPx: number,
  fontSize: number,
  textStyle: TextStyle,
  sidePadPx: number,
  thickness: number,
  letterSpacing: number,
): number {
  const maxW = boxWidthPx - 2 * sidePadPx;
  const source = textStyle === "neon" ? neonDisplayText(text) : text;
  let budget = wrapCharsForBox(boxWidthPx, fontSize, textStyle, sidePadPx);
  while (budget > 1) {
    const lines = wrapText(source, budget).split("\n");
    const fits = lines.every(
      (line) => lineWidthPx(line, fontSize, textStyle, thickness, letterSpacing) <= maxW,
    );
    if (fits) {
      return budget;
    }
    budget -= 1;
  }
  return 1;
}
