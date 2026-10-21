import { describe, expect, it } from "vitest";
import {
  bananaPeelBeadRadiusPx,
  bananaPeelCrackHalfPose,
  bananaPeelCracksAfterDrop,
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

  it("adds a crack for each dropped peel and keeps unfinished cracks", () => {
    const existing = [{ x: 0, y: 0, startMs: 1000 }];
    const next = bananaPeelCracksAfterDrop(2, 1, [{ x: 10, y: 20 }], 1200, existing);
    expect(next).toHaveLength(2);
    expect(next.at(-1)).toMatchObject({ x: 10, y: 20, startMs: 1200 });
  });

  it("does not crack when peels stay the same or grow", () => {
    expect(bananaPeelCracksAfterDrop(1, 1, [{ x: 1, y: 1 }], 0, [])).toEqual([]);
    expect(bananaPeelCracksAfterDrop(0, 1, [], 0, [])).toEqual([]);
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
