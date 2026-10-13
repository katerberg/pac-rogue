import { describe, expect, it } from "vitest";
import { meanCi, separated, synergy, wilson } from "./stats";

describe("stats", () => {
  it("computes Wilson intervals", () => {
    const half = wilson(5, 10);
    expect(half.value).toBe(0.5);
    expect(half.lo).toBeCloseTo(0.237, 3);
    expect(half.hi).toBeCloseTo(0.763, 3);
    expect(wilson(0, 0)).toEqual({ value: 0, lo: 0, hi: 1, n: 0 });
  });

  it("computes normal intervals on the mean", () => {
    const ci = meanCi([1, 2, 3, 4, 5]);
    expect(ci.value).toBe(3);
    expect(ci.hi - ci.value).toBeCloseTo(1.96 * Math.sqrt(2.5 / 5), 6);
  });

  it("flags only non-overlapping intervals", () => {
    expect(separated(wilson(1, 100), wilson(90, 100))).toBe(true);
    expect(separated(wilson(45, 100), wilson(55, 100))).toBe(false);
  });

  it("measures pair synergy against the parts", () => {
    expect(synergy(0.9, 0.6, 0.5, 0.4)).toBeCloseTo(0.2, 10);
  });
});
