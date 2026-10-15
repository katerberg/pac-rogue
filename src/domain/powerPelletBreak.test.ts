import { describe, expect, it } from "vitest";
import { PLAYER_SPEED } from "./playfield";
import { resolveTuning, speedLevelMultiplier } from "./tuning";
import {
  POWER_PELLET_BREAK_AHEAD_FRAC,
  POWER_PELLET_BREAK_BEHIND_PX,
  POWER_PELLET_BREAK_FALL_PX,
  POWER_PELLET_BREAK_FRAGMENT_FRAC,
  POWER_PELLET_BREAK_INTENSITY_HARD,
  POWER_PELLET_BREAK_INTENSITY_SOFT,
  POWER_PELLET_BREAK_MS,
  POWER_PELLET_BREAK_REST_FRAC,
  POWER_PELLET_BREAK_SPLIT_PX,
  powerPelletBreakFragmentSize,
  powerPelletBreakIntensity,
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

describe("powerPelletBreakIntensity", () => {
  it("is soft at level-1 baseline speed and hard at level-7 baseline", () => {
    expect(powerPelletBreakIntensity(PLAYER_SPEED * speedLevelMultiplier(1))).toBeCloseTo(
      POWER_PELLET_BREAK_INTENSITY_SOFT,
    );
    expect(powerPelletBreakIntensity(PLAYER_SPEED * speedLevelMultiplier(7))).toBeCloseTo(
      POWER_PELLET_BREAK_INTENSITY_HARD,
    );
  });

  it("clamps below soft and above hard", () => {
    expect(powerPelletBreakIntensity(0)).toBe(POWER_PELLET_BREAK_INTENSITY_SOFT);
    expect(powerPelletBreakIntensity(PLAYER_SPEED * 10)).toBe(POWER_PELLET_BREAK_INTENSITY_HARD);
  });

  it("anchors soft/hard to the given tuning levelSpeedRamp", () => {
    const steep = resolveTuning({ levelSpeedRamp: 0.1 });
    const defaultHardSpeed = PLAYER_SPEED * speedLevelMultiplier(7);
    expect(powerPelletBreakIntensity(defaultHardSpeed)).toBeCloseTo(
      POWER_PELLET_BREAK_INTENSITY_HARD,
    );
    expect(powerPelletBreakIntensity(defaultHardSpeed, PLAYER_SPEED, steep)).toBeCloseTo(
      POWER_PELLET_BREAK_INTENSITY_SOFT +
        0.5 * (POWER_PELLET_BREAK_INTENSITY_HARD - POWER_PELLET_BREAK_INTENSITY_SOFT),
    );
    expect(
      powerPelletBreakIntensity(PLAYER_SPEED * speedLevelMultiplier(7, steep), PLAYER_SPEED, steep),
    ).toBeCloseTo(POWER_PELLET_BREAK_INTENSITY_HARD);
  });
});

describe("powerPelletBreakLook", () => {
  it("starts assembled and ends split with no facing", () => {
    const start = powerPelletBreakLook(0, { dx: 0, dy: 0 });
    expect(start).toHaveLength(4);
    for (const q of start) {
      expect(q.offsetX).toBeCloseTo(0);
      expect(q.offsetY).toBeCloseTo(0);
      expect(q.alpha).toBe(1);
    }
    const end = powerPelletBreakLook(1, { dx: 0, dy: 0 });
    const nw = end.find((q) => q.id === "nw")!;
    expect(nw.offsetX).toBe(-POWER_PELLET_BREAK_SPLIT_PX);
    expect(nw.offsetY).toBe(-POWER_PELLET_BREAK_SPLIT_PX + POWER_PELLET_BREAK_FALL_PX * 0.5);
    expect(end.every((q) => q.alpha === 0)).toBe(true);
  });

  it("when moving left, trail-side (right) chips fling behind and ahead chips barely go forward", () => {
    const end = powerPelletBreakLook(1, { dx: -1, dy: 0 });
    const nw = end.find((q) => q.id === "nw")!;
    const sw = end.find((q) => q.id === "sw")!;
    const ne = end.find((q) => q.id === "ne")!;
    const se = end.find((q) => q.id === "se")!;

    expect(ne.offsetX).toBeCloseTo(POWER_PELLET_BREAK_SPLIT_PX + POWER_PELLET_BREAK_BEHIND_PX);
    expect(se.offsetX).toBeCloseTo(POWER_PELLET_BREAK_SPLIT_PX + POWER_PELLET_BREAK_BEHIND_PX);
    expect(nw.offsetX).toBeGreaterThanOrEqual(
      -POWER_PELLET_BREAK_SPLIT_PX * POWER_PELLET_BREAK_AHEAD_FRAC - 0.01,
    );
    expect(sw.offsetX).toBeGreaterThanOrEqual(
      -POWER_PELLET_BREAK_SPLIT_PX * POWER_PELLET_BREAK_AHEAD_FRAC - 0.01,
    );
  });

  it("when moving up, trail-side (bottom) chips fling behind (down), not ahead", () => {
    const end = powerPelletBreakLook(1, { dx: 0, dy: -1 });
    const nw = end.find((q) => q.id === "nw")!;
    const sw = end.find((q) => q.id === "sw")!;
    const se = end.find((q) => q.id === "se")!;

    const trailY =
      POWER_PELLET_BREAK_SPLIT_PX +
      POWER_PELLET_BREAK_BEHIND_PX +
      POWER_PELLET_BREAK_FALL_PX * 0.25;
    expect(sw.offsetY).toBeCloseTo(trailY);
    expect(se.offsetY).toBeCloseTo(trailY);
    expect(nw.offsetY).toBeGreaterThanOrEqual(
      -POWER_PELLET_BREAK_SPLIT_PX * POWER_PELLET_BREAK_AHEAD_FRAC - 0.01,
    );
  });

  it("scales travel with intensity without changing the soft/hard ratio shape", () => {
    const soft = powerPelletBreakLook(1, { dx: 1, dy: 0 }, POWER_PELLET_BREAK_INTENSITY_SOFT);
    const hard = powerPelletBreakLook(1, { dx: 1, dy: 0 }, POWER_PELLET_BREAK_INTENSITY_HARD);
    // Trail side when facing right is NW/SW (negative along).
    const softNw = soft.find((q) => q.id === "nw")!;
    const hardNw = hard.find((q) => q.id === "nw")!;
    expect(hardNw.offsetX / softNw.offsetX).toBeCloseTo(
      POWER_PELLET_BREAK_INTENSITY_HARD / POWER_PELLET_BREAK_INTENSITY_SOFT,
    );
  });
});

describe("powerPelletQuarterRestOffset", () => {
  it("places chips near the pellet center", () => {
    const inset = 16 * POWER_PELLET_BREAK_REST_FRAC;
    expect(powerPelletQuarterRestOffset("nw", 16)).toEqual({ x: -inset, y: -inset });
    expect(powerPelletQuarterRestOffset("se", 16)).toEqual({ x: inset, y: inset });
  });
});

describe("powerPelletBreakFragmentSize", () => {
  it("is a small fraction of the pellet display size", () => {
    expect(powerPelletBreakFragmentSize(16)).toBe(16 * POWER_PELLET_BREAK_FRAGMENT_FRAC);
    expect(powerPelletBreakFragmentSize(16)).toBeLessThan(16 / 2);
  });
});
