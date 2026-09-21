import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { GHOST_AI_MODE } from "./ghostMode";
import {
  ghostKindsForLevel,
  ghostModeStartWaveIndex,
  ghostModeWavesForLevel,
  ghostSpeedLevelMul,
} from "./levelRules";

describe("ghostSpeedLevelMul", () => {
  it("scales linearly by 10% per level after the first", () => {
    expect(ghostSpeedLevelMul(1)).toBe(1);
    expect(ghostSpeedLevelMul(2)).toBe(1.1);
    expect(ghostSpeedLevelMul(3)).toBe(1.2);
  });

  it("clamps below 1 to level 1 mul", () => {
    expect(ghostSpeedLevelMul(0)).toBe(1);
    expect(ghostSpeedLevelMul(-2)).toBe(1);
  });
});

describe("ghostKindsForLevel", () => {
  it("unlocks Blinky then Pinky then Inky then Clyde", () => {
    expect(ghostKindsForLevel(1)).toEqual([GHOST_KIND.blinky]);
    expect(ghostKindsForLevel(2)).toEqual([GHOST_KIND.blinky, GHOST_KIND.pinky]);
    expect(ghostKindsForLevel(3)).toEqual([GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky]);
    expect(ghostKindsForLevel(4)).toEqual([
      GHOST_KIND.blinky,
      GHOST_KIND.pinky,
      GHOST_KIND.inky,
      GHOST_KIND.clyde,
    ]);
    expect(ghostKindsForLevel(5)).toEqual(ghostKindsForLevel(4));
  });

  it("clamps below 1 to level 1 roster", () => {
    expect(ghostKindsForLevel(0)).toEqual([GHOST_KIND.blinky]);
    expect(ghostKindsForLevel(-2)).toEqual([GHOST_KIND.blinky]);
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
    expect(ghostModeStartWaveIndex(1)).toBe(0);
  });

  it("uses arcade chase-first table on level 2+", () => {
    const waves = ghostModeWavesForLevel(2);
    expect(waves[0]).toEqual({ mode: GHOST_AI_MODE.scatter, durationMs: 7_000 });
    expect(waves[1]).toEqual({ mode: GHOST_AI_MODE.chase, durationMs: 20_000 });
    expect(waves[waves.length - 1]?.durationMs).toBe(Number.POSITIVE_INFINITY);
    expect(ghostModeStartWaveIndex(2)).toBe(1);
    expect(ghostModeWavesForLevel(5)).toEqual(waves);
    expect(ghostModeWavesForLevel(5)).toBe(ghostModeWavesForLevel(2));
  });

  it("clamps below 1 to level 1 schedule", () => {
    expect(ghostModeWavesForLevel(0)).toEqual(ghostModeWavesForLevel(1));
    expect(ghostModeStartWaveIndex(-2)).toBe(0);
  });
});
