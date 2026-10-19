import { describe, expect, it } from "vitest";
import { stackRowTops, stackRowTopsFromTop, wrapCharsForBox } from "./textLayout";

describe("wrapCharsForBox", () => {
  it("counts whole glyphs inside the side pads and never drops below one", () => {
    expect(wrapCharsForBox(168, 8, 8)).toBe(19);
    expect(wrapCharsForBox(10, 8, 8)).toBe(1);
  });
});

describe("row stacking", () => {
  it("centers the stack, keeping each row clear of the next", () => {
    const heights = [16, 8, 24];
    const gaps = [8, 16, 0];
    const tops = stackRowTops(heights, gaps, 0);
    expect(tops).toEqual([-36, -12, 12]);
    expect(tops[0]! + heights[0]!).toBeLessThanOrEqual(tops[1]!);
  });

  it("anchors a top-down stack at the given top", () => {
    expect(stackRowTopsFromTop([10, 10], [5, 0], 100)).toEqual([100, 115]);
  });
});
