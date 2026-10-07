import { describe, expect, it } from "vitest";
import { neonTextLocalHeight } from "./layout";
import {
  fitFontSizeFloor,
  interTextGap,
  stackRowsNonOverlapping,
  stackRowTops,
  wrapCharBudget,
} from "./textStack";

describe("text stack layout", () => {
  it("keeps pixel wrap budgets and widens neon by 1.75×", () => {
    expect(wrapCharBudget(22, "pixel")).toBe(22);
    expect(wrapCharBudget(22, "neon")).toBe(39);
    expect(wrapCharBudget(8, "neon")).toBe(14);
  });

  it("scales inter-row gaps for neon only", () => {
    expect(interTextGap(8, "neon")).toBe(12);
    expect(interTextGap(16, "neon")).toBe(24);
    expect(interTextGap(16, "pixel")).toBe(16);
  });

  it("floors title fit at 16 and small text at 8", () => {
    expect(fitFontSizeFloor(32)).toBe(16);
    expect(fitFontSizeFloor(22)).toBe(16);
    expect(fitFontSizeFloor(16)).toBe(8);
    expect(fitFontSizeFloor(8)).toBe(8);
  });

  it("stacks school above body with style-aware gaps (store confirm geometry)", () => {
    const titleH = neonTextLocalHeight(2, 32, 0);
    const schoolH = 8;
    const bodyH = neonTextLocalHeight(4, 8, 0);
    const costH = 16;
    const schoolGap = interTextGap(8, "neon");
    const bodyGap = interTextGap(16, "neon");
    const costGap = interTextGap(16, "neon");
    const heights = [titleH, schoolH, bodyH, costH];
    const gaps = [schoolGap, bodyGap, costGap, 0];
    expect(stackRowsNonOverlapping(heights, gaps, 0)).toBe(true);
    const tops = stackRowTops(heights, gaps, 0);
    expect(tops[1]! + schoolH).toBeLessThanOrEqual(tops[2]!);
  });

  it("old store fixed bodyY=8 overlaps a tall neon title+school stack", () => {
    const titleH = neonTextLocalHeight(2, 32, 0);
    const schoolH = 8;
    const schoolGap = 8;
    const titleSchoolCenterY = -58;
    const tops = stackRowTops([titleH, schoolH], [schoolGap, 0], titleSchoolCenterY);
    const schoolBottom = tops[1]! + schoolH;
    const bodyH = neonTextLocalHeight(4, 8, 0);
    const bodyTop = 8 - bodyH / 2;
    expect(schoolBottom).toBeGreaterThan(bodyTop);
  });
});
