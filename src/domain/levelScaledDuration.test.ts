import { describe, expect, it } from "vitest";
import { levelScaledDurationMs } from "./levelScaledDuration";

describe("levelScaledDurationMs", () => {
  it("shortens 3s to 2s by level 5", () => {
    const byLevel = [1, 2, 3, 4, 5, 6, 9].map((level) => levelScaledDurationMs(3000, level));
    expect(byLevel).toEqual([3000, 2750, 2500, 2250, 2000, 2000, 2000]);
  });

  it("shortens 5s to ~3.333s by level 5", () => {
    const byLevel = [1, 2, 3, 4, 5, 6, 9].map((level) => levelScaledDurationMs(5000, level));
    expect(byLevel).toEqual([5000, 4583, 4166, 3749, 3333, 3333, 3333]);
  });

  it("shortens 6s to 4s by level 5", () => {
    const byLevel = [1, 2, 3, 4, 5, 6, 9].map((level) => levelScaledDurationMs(6000, level));
    expect(byLevel).toEqual([6000, 5500, 5000, 4500, 4000, 4000, 4000]);
  });

  it("treats levelIndex below 1 as level 1", () => {
    expect(levelScaledDurationMs(3000, 0)).toBe(3000);
    expect(levelScaledDurationMs(3000, -2)).toBe(3000);
  });
});
