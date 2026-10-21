import { describe, expect, it } from "vitest";
import {
  BANANA_PEEL_DISPLAY_SIZE_PX,
  bananaPeelBeadRadiusPx,
  bananaPeelCrackHalfPose,
  bananaPeelLayout,
  bananaPeelSprites,
} from "./bananaPeel";
import { DEFAULT_CHARM_TUNING } from "./charmTailParams";

describe("bananaPeel", () => {
  it("maps beads to sprite centers", () => {
    expect(bananaPeelSprites([{ x: 1, y: 2, vx: 0, vy: 0 }])).toEqual([{ x: 1, y: 2 }]);
  });

  it("draws ~30% larger than the default charm bead while staying crisp-friendly", () => {
    expect(BANANA_PEEL_DISPLAY_SIZE_PX).toBe(Math.round(DEFAULT_CHARM_TUNING.charmSize * 1.3));
  });

  it("uses charm layout radius for peel collision", () => {
    expect(bananaPeelBeadRadiusPx(bananaPeelLayout())).toBeGreaterThan(0);
  });

  it("splits crack halves left and right", () => {
    const left = bananaPeelCrackHalfPose({ x: 50, y: 50 }, -1, 16, 0);
    const right = bananaPeelCrackHalfPose({ x: 50, y: 50 }, 1, 16, 0);
    expect(left.x).toBeLessThan(right.x);
    expect(left.cropX).toBe(0);
    expect(right.cropX).toBeGreaterThan(0);
    expect(left.alpha).toBe(1);
  });
});
