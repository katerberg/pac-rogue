import { describe, expect, it } from "vitest";
import {
  POWER_PELLET_BREAK_FALL_PX,
  POWER_PELLET_BREAK_FORWARD_PX,
  POWER_PELLET_BREAK_MS,
  POWER_PELLET_BREAK_REAR_BACK_FRAC,
  POWER_PELLET_BREAK_SPLIT_PX,
  powerPelletBreakLook,
  powerPelletBreakProgress,
  powerPelletQuarterRestOffset,
} from "./powerPelletBreak";

describe("powerPelletBreakProgress", () => {
  it("runs 0 to 1 over POWER_PELLET_BREAK_MS and clamps", () => {
    expect(powerPelletBreakProgress(0)).toBe(0);
    expect(powerPelletBreakProgress(POWER_PELLET_BREAK_MS / 2)).toBe(0.5);
    expect(powerPelletBreakProgress(POWER_PELLET_BREAK_MS * 2)).toBe(1);
  });
});

describe("powerPelletBreakLook", () => {
  it("starts assembled and ends split, fallen and faded with no facing", () => {
    const start = powerPelletBreakLook(0, { dx: 0, dy: 0 });
    expect(start).toHaveLength(4);
    for (const q of start) {
      expect(q.offsetX).toBeCloseTo(0);
      expect(q.offsetY).toBeCloseTo(0);
      expect(q.alpha).toBe(1);
      expect(q.rotation).toBeCloseTo(0);
    }
    const end = powerPelletBreakLook(1, { dx: 0, dy: 0 });
    const nw = end.find((q) => q.id === "nw")!;
    const se = end.find((q) => q.id === "se")!;
    expect(nw.offsetX).toBe(-POWER_PELLET_BREAK_SPLIT_PX);
    expect(nw.offsetY).toBe(-POWER_PELLET_BREAK_SPLIT_PX + POWER_PELLET_BREAK_FALL_PX);
    expect(se.offsetX).toBe(POWER_PELLET_BREAK_SPLIT_PX);
    expect(se.offsetY).toBe(POWER_PELLET_BREAK_SPLIT_PX + POWER_PELLET_BREAK_FALL_PX);
    expect(end.every((q) => q.alpha === 0)).toBe(true);
  });

  it("when moving left, left quarters fly forward and right quarters barely go back", () => {
    const end = powerPelletBreakLook(1, { dx: -1, dy: 0 });
    const nw = end.find((q) => q.id === "nw")!;
    const sw = end.find((q) => q.id === "sw")!;
    const ne = end.find((q) => q.id === "ne")!;
    const se = end.find((q) => q.id === "se")!;

    expect(nw.offsetX).toBeLessThan(-POWER_PELLET_BREAK_SPLIT_PX);
    expect(sw.offsetX).toBeLessThan(-POWER_PELLET_BREAK_SPLIT_PX);
    expect(nw.offsetX).toBeCloseTo(-POWER_PELLET_BREAK_SPLIT_PX - POWER_PELLET_BREAK_FORWARD_PX);
    expect(sw.offsetX).toBeCloseTo(-POWER_PELLET_BREAK_SPLIT_PX - POWER_PELLET_BREAK_FORWARD_PX);

    expect(ne.offsetX).toBeLessThanOrEqual(
      POWER_PELLET_BREAK_SPLIT_PX * POWER_PELLET_BREAK_REAR_BACK_FRAC + 0.01,
    );
    expect(se.offsetX).toBeLessThanOrEqual(
      POWER_PELLET_BREAK_SPLIT_PX * POWER_PELLET_BREAK_REAR_BACK_FRAC + 0.01,
    );
    expect(ne.offsetY).toBeGreaterThan(POWER_PELLET_BREAK_FALL_PX * 0.4);
    expect(se.offsetY).toBeGreaterThan(POWER_PELLET_BREAK_FALL_PX * 0.4);
  });

  it("splits fast then falls faster", () => {
    const mid = powerPelletBreakLook(0.5, { dx: 0, dy: 0 });
    const se = mid.find((q) => q.id === "se")!;
    expect(Math.abs(se.offsetX)).toBeGreaterThan(POWER_PELLET_BREAK_SPLIT_PX / 2);
    expect(se.offsetY - se.offsetX).toBeLessThan(POWER_PELLET_BREAK_FALL_PX / 2);
  });
});

describe("powerPelletQuarterRestOffset", () => {
  it("places quarters at the four corners of the pellet", () => {
    expect(powerPelletQuarterRestOffset("nw", 16)).toEqual({ x: -4, y: -4 });
    expect(powerPelletQuarterRestOffset("ne", 16)).toEqual({ x: 4, y: -4 });
    expect(powerPelletQuarterRestOffset("sw", 16)).toEqual({ x: -4, y: 4 });
    expect(powerPelletQuarterRestOffset("se", 16)).toEqual({ x: 4, y: 4 });
  });
});
