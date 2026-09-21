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
    expect(started.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("forces reverse when leaving the opening chase wave into scatter", () => {
    let clock = startGhostModeClock(2);
    const tick = tickGhostMode(clock, 20_000);
    expect(tick.forceReverse).toBe(true);
    expect(tick.clock.mode).toBe(GHOST_AI_MODE.scatter);
    clock = tick.clock;

    const midScatter = tickGhostMode(clock, 1_000);
    expect(midScatter.forceReverse).toBe(false);
    expect(midScatter.clock.mode).toBe(GHOST_AI_MODE.scatter);
  });

  it("uses arcade scatter durations after the opening chase", () => {
    let clock = startGhostModeClock(2);
    clock = tickGhostMode(clock, 20_000).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.scatter);

    clock = tickGhostMode(clock, 7_000).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.chase);

    clock = tickGhostMode(clock, 20_000).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.scatter);

    clock = tickGhostMode(clock, 5_000).clock;
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

    const resumed = resolveGhostModeStep(clock, false, 20_000);
    expect(resumed.clock.waveIndex).toBeGreaterThan(clock.waveIndex);
    expect(resumed.mode).toBe(GHOST_AI_MODE.scatter);
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
