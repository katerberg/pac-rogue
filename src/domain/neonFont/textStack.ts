/** Neon ink is ~half a pixel cell wide; char-wrap budgets scale so cards fill sideways. */
export const NEON_WRAP_CHAR_MUL = 1.75;

/** Extra air between separately placed GameText rows (not inside one NeonText). */
export const NEON_INTER_ROW_GAP_MUL = 1.5;

/** Assumed neon cell width for title fit (pixel uses 8). */
export const NEON_FIT_CELL_PX = 4;

export type TextStyle = "neon" | "pixel";

export function wrapCharBudget(pixelBudget: number, textStyle: TextStyle): number {
  return textStyle === "neon" ? Math.round(pixelBudget * NEON_WRAP_CHAR_MUL) : pixelBudget;
}

export function interTextGap(baseGapPx: number, textStyle: TextStyle): number {
  return textStyle === "neon" ? Math.round(baseGapPx * NEON_INTER_ROW_GAP_MUL) : baseGapPx;
}

/** Preferred ≥ 22 → floor 16; otherwise floor 8. Never go tiny on titles. */
export function fitFontSizeFloor(preferredSize: number): number {
  return preferredSize >= 22 ? 16 : 8;
}

/**
 * Top Y of each row when stacking top-anchored blocks around `centerY`.
 * Heights and gaps are in the same units (px).
 */
export function stackRowTops(
  heights: readonly number[],
  gapsBelow: readonly number[],
  centerY: number,
): number[] {
  let total = 0;
  for (let i = 0; i < heights.length; i += 1) {
    total += heights[i]! + (gapsBelow[i] ?? 0);
  }
  let top = centerY - total / 2;
  const tops: number[] = [];
  for (let i = 0; i < heights.length; i += 1) {
    tops.push(top);
    top += heights[i]! + (gapsBelow[i] ?? 0);
  }
  return tops;
}

/** True when each row's ink box ends at or above the next row's top (no vertical overlap). */
export function stackRowsNonOverlapping(
  heights: readonly number[],
  gapsBelow: readonly number[],
  centerY: number,
): boolean {
  const tops = stackRowTops(heights, gapsBelow, centerY);
  for (let i = 0; i < heights.length - 1; i += 1) {
    if (tops[i]! + heights[i]! > tops[i + 1]!) {
      return false;
    }
  }
  return true;
}
