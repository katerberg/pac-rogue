import { describe, expect, it } from "vitest";
import {
  createGhostModeClock,
  ghostModeFlip,
  startGhostModeClock,
  tickGhostMode,
} from "./ghostMode";
import { ghostModeWavesForLevel } from "./levelRules";

describe("ghostModeFlip", () => {
  it("is unknown before the clock starts and absent on a chase-only level", () => {
    expect(ghostModeFlip(createGhostModeClock(3))).toBeNull();
    expect(ghostModeFlip(startGhostModeClock(1))).toBeNull();
  });

  it("counts down to the next wave and names its mode", () => {
    const waves = ghostModeWavesForLevel(3);
    const started = startGhostModeClock(3);
    expect(ghostModeFlip(started)).toEqual({ inMs: waves[0]!.durationMs, mode: waves[1]!.mode });
    const later = tickGhostMode(started, 1000).clock;
    expect(ghostModeFlip(later)!.inMs).toBe(waves[0]!.durationMs - 1000);
  });
});
