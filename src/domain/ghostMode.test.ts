import { describe, expect, it } from "vitest";
import {
  createGhostModeClock,
  GHOST_AI_MODE,
  resolveGhostModeStep,
  startGhostModeClock,
  tickGhostMode,
} from "./ghostMode";

describe("ghostMode", () => {
  it("starts inactive until startGhostModeClock", () => {
    const idle = createGhostModeClock(2);
    expect(idle.active).toBe(false);
    expect(idle.levelIndex).toBe(2);
    expect(tickGhostMode(idle, 1000).forceReverse).toBe(false);

    const started = startGhostModeClock(2);
    expect(started.active).toBe(true);
  });

  it("opens levels 2+ with scatter and forces reverse into the first chase", () => {
    const started = startGhostModeClock(2);
    expect(started.mode).toBe(GHOST_AI_MODE.scatter);
    expect(startGhostModeClock(5).mode).toBe(GHOST_AI_MODE.scatter);

    const tick = tickGhostMode(started, 7_000);
    expect(tick.forceReverse).toBe(true);
    expect(tick.clock.mode).toBe(GHOST_AI_MODE.chase);

    const midChase = tickGhostMode(tick.clock, 1_000);
    expect(midChase.forceReverse).toBe(false);
    expect(midChase.clock.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("uses arcade durations, ending in permanent chase on levels 2-4", () => {
    let clock = startGhostModeClock(2);
    for (const [ms, mode] of [
      [7_000, GHOST_AI_MODE.chase],
      [20_000, GHOST_AI_MODE.scatter],
      [7_000, GHOST_AI_MODE.chase],
      [20_000, GHOST_AI_MODE.scatter],
      [5_000, GHOST_AI_MODE.chase],
      [100_000, GHOST_AI_MODE.chase],
    ] as const) {
      clock = tickGhostMode(clock, ms).clock;
      expect(clock.mode).toBe(mode);
    }
  });

  it("uses 5s opening scatter from level 5", () => {
    let clock = startGhostModeClock(5);
    clock = tickGhostMode(clock, 4_999).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.scatter);
    clock = tickGhostMode(clock, 1).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("stays in chase forever on level 1 with no wave reverse", () => {
    let clock = startGhostModeClock(1);
    expect(clock.mode).toBe(GHOST_AI_MODE.chase);
    expect(clock.waveIndex).toBe(0);

    const tick = tickGhostMode(clock, 20_000 + 7_000 + 20_000);
    expect(tick.forceReverse).toBe(false);
    expect(tick.clock.mode).toBe(GHOST_AI_MODE.chase);
    clock = tick.clock;

    const later = tickGhostMode(clock, 60_000);
    expect(later.forceReverse).toBe(false);
    expect(later.clock.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("pauses the wave clock while scatter burst is active", () => {
    const clock = startGhostModeClock(2);
    const paused = resolveGhostModeStep(clock, true, 5_000);
    expect(paused.clock).toEqual(clock);
    expect(paused.mode).toBe(GHOST_AI_MODE.scatter);

    const resumed = resolveGhostModeStep(clock, false, 7_000);
    expect(resumed.clock.waveIndex).toBeGreaterThan(clock.waveIndex);
    expect(resumed.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("allows scatter burst to force scatter on level 1", () => {
    const clock = startGhostModeClock(1);
    const paused = resolveGhostModeStep(clock, true, 5_000);
    expect(paused.clock).toEqual(clock);
    expect(paused.mode).toBe(GHOST_AI_MODE.scatter);

    const resumed = resolveGhostModeStep(clock, false, 5_000);
    expect(resumed.clock.mode).toBe(GHOST_AI_MODE.chase);
    expect(resumed.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("ignores scatter burst while the wave clock is inactive", () => {
    const idle = createGhostModeClock(1);
    const step = resolveGhostModeStep(idle, true, 5_000);
    expect(step.clock).toEqual(idle);
    expect(step.mode).toBe(GHOST_AI_MODE.chase);
  });
});
