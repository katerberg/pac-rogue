import { describe, expect, it } from "vitest";
import {
  bananaPeelBeadRadiusPx,
  bananaPeelCrackHalfPose,
  bananaPeelLayout,
  bananaPeelSprites,
} from "./bananaPeel";

describe("bananaPeel", () => {
  it("maps beads to sprite centers", () => {
    expect(bananaPeelSprites([{ x: 1, y: 2, vx: 0, vy: 0 }])).toEqual([{ x: 1, y: 2 }]);
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
