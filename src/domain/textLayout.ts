export function wrapCharsForBox(boxWidthPx: number, fontSize: number, sidePadPx: number): number {
  const inner = Math.max(1, boxWidthPx - 2 * sidePadPx);
  return Math.max(1, Math.floor(inner / Math.max(1, fontSize)));
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
