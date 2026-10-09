import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { GHOST_AI_MODE } from "./ghostMode";
import {
  enhancedOfferChance,
  ghostBaseSpeedRatio,
  ghostKindsForLevel,
  ghostModeWavesForLevel,
  isInvertedMazeLevel,
  isTimedTunnelLevel,
  MAX_LEVEL,
  offersUpgradeAfterLevel,
  speedLevelMultiplier,
} from "./levelRules";

describe("MAX_LEVEL", () => {
  it("caps the fixed level plan at 9 (level 9 is the boss)", () => {
    expect(MAX_LEVEL).toBe(9);
  });
});

describe("offersUpgradeAfterLevel", () => {
  it("skips the first and final levels", () => {
    expect(offersUpgradeAfterLevel(1)).toBe(false);
    expect(offersUpgradeAfterLevel(MAX_LEVEL)).toBe(false);
  });

  it("offers after every level in between", () => {
    for (let level = 2; level < MAX_LEVEL; level++) {
      expect(offersUpgradeAfterLevel(level)).toBe(true);
    }
  });
});

describe("speedLevelMultiplier", () => {
  it("scales linearly by 5% per level after the first", () => {
    expect(speedLevelMultiplier(1)).toBe(1);
    expect(speedLevelMultiplier(2)).toBe(1.05);
    expect(speedLevelMultiplier(3)).toBe(1.1);
  });

  it("clamps below 1 to level 1 mul", () => {
    expect(speedLevelMultiplier(0)).toBe(1);
    expect(speedLevelMultiplier(-2)).toBe(1);
  });
});

describe("ghostBaseSpeedRatio", () => {
  it("ramps from 0.8 at level 1 to 1.0 at level 5, 5% per level", () => {
    expect(ghostBaseSpeedRatio(1)).toBe(0.8);
    expect(ghostBaseSpeedRatio(2)).toBeCloseTo(0.85);
    expect(ghostBaseSpeedRatio(3)).toBeCloseTo(0.9);
    expect(ghostBaseSpeedRatio(4)).toBeCloseTo(0.95);
    expect(ghostBaseSpeedRatio(5)).toBe(1);
  });

  it("keeps climbing past parity after level 5, capping at 1.1 by level 7–8", () => {
    expect(ghostBaseSpeedRatio(6)).toBeCloseTo(1.05);
    expect(ghostBaseSpeedRatio(7)).toBeCloseTo(1.1);
    expect(ghostBaseSpeedRatio(8)).toBeCloseTo(1.1);
    expect(ghostBaseSpeedRatio(MAX_LEVEL)).toBeCloseTo(1.1);
  });

  it("clamps below 1 to level 1 ratio", () => {
    expect(ghostBaseSpeedRatio(0)).toBe(0.8);
    expect(ghostBaseSpeedRatio(-2)).toBe(0.8);
  });
});

describe("ghostKindsForLevel", () => {
  it("level 1 is Blinky plus whichever second ghost is passed in (2 ghosts)", () => {
    expect(ghostKindsForLevel(1, GHOST_KIND.pinky)).toEqual([GHOST_KIND.blinky, GHOST_KIND.pinky]);
    expect(ghostKindsForLevel(1, GHOST_KIND.inky)).toEqual([GHOST_KIND.blinky, GHOST_KIND.inky]);
  });

  it("level 2 is Blinky, Pinky, and Inky (3 ghosts), ordered by the second-ghost arg", () => {
    expect(ghostKindsForLevel(2, GHOST_KIND.pinky)).toEqual([
      GHOST_KIND.blinky,
      GHOST_KIND.pinky,
      GHOST_KIND.inky,
    ]);
    expect(ghostKindsForLevel(2, GHOST_KIND.inky)).toEqual([
      GHOST_KIND.blinky,
      GHOST_KIND.inky,
      GHOST_KIND.pinky,
    ]);
  });

  it("level 3+ is always all four ghosts, regardless of the second-ghost arg", () => {
    const allFour = [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde];
    expect(ghostKindsForLevel(3, GHOST_KIND.pinky)).toEqual(allFour);
    expect(ghostKindsForLevel(4, GHOST_KIND.inky)).toEqual(allFour);
    expect(ghostKindsForLevel(MAX_LEVEL, GHOST_KIND.pinky)).toEqual(allFour);
  });

  it("clamps below 1 to level 1 roster", () => {
    expect(ghostKindsForLevel(0, GHOST_KIND.pinky)).toEqual([GHOST_KIND.blinky, GHOST_KIND.pinky]);
    expect(ghostKindsForLevel(-2, GHOST_KIND.inky)).toEqual([GHOST_KIND.blinky, GHOST_KIND.inky]);
  });
});

describe("ghostModeWavesForLevel", () => {
  it("uses chase-only infinite wave on level 1", () => {
    const waves = ghostModeWavesForLevel(1);
    expect(waves).toHaveLength(1);
    expect(waves[0]).toEqual({
      mode: GHOST_AI_MODE.chase,
      durationMs: Number.POSITIVE_INFINITY,
    });
  });

  it("opens with scatter and only a 5s third scatter on levels 2-4", () => {
    const waves = ghostModeWavesForLevel(2);
    expect(waves.map((w) => w.durationMs)).toEqual([
      7_000,
      20_000,
      7_000,
      20_000,
      5_000,
      Number.POSITIVE_INFINITY,
    ]);
    expect(waves.map((w) => w.mode)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(ghostModeWavesForLevel(4)).toBe(waves);
  });

  it("uses 5s scatters from level 5 on", () => {
    const waves = ghostModeWavesForLevel(5);
    expect(waves.filter((w) => w.mode === GHOST_AI_MODE.scatter)).toEqual([
      { mode: GHOST_AI_MODE.scatter, durationMs: 5_000 },
      { mode: GHOST_AI_MODE.scatter, durationMs: 5_000 },
      { mode: GHOST_AI_MODE.scatter, durationMs: 5_000 },
    ]);
    expect(ghostModeWavesForLevel(9)).toBe(waves);
  });

  it("clamps below 1 to level 1 schedule", () => {
    expect(ghostModeWavesForLevel(0)).toEqual(ghostModeWavesForLevel(1));
  });
});

describe("isInvertedMazeLevel", () => {
  it("is true only for levels 6 and 7", () => {
    expect(isInvertedMazeLevel(6)).toBe(true);
    expect(isInvertedMazeLevel(7)).toBe(true);
    for (const level of [1, 2, 3, 4, 5, 8]) {
      expect(isInvertedMazeLevel(level)).toBe(false);
    }
  });
});

describe("isTimedTunnelLevel", () => {
  it("is true only for levels 7 and 8", () => {
    expect(isTimedTunnelLevel(7)).toBe(true);
    expect(isTimedTunnelLevel(8)).toBe(true);
    for (const level of [1, 2, 3, 4, 5, 6, 9]) {
      expect(isTimedTunnelLevel(level)).toBe(false);
    }
  });
});

describe("enhancedOfferChance", () => {
  it("is 1/8 after levels 4-8 and 0 otherwise", () => {
    for (const level of [1, 2, 3, 9]) {
      expect(enhancedOfferChance(level)).toBe(0);
    }
    for (const level of [4, 5, 6, 7, 8]) {
      expect(enhancedOfferChance(level)).toBe(1 / 8);
    }
  });
});
