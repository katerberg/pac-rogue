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
    const idle = createGhostModeClock();
    expect(idle.active).toBe(false);
    expect(tickGhostMode(idle, 1000).forceReverse).toBe(false);

    const started = startGhostModeClock();
    expect(started.active).toBe(true);
    expect(started.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("forces reverse when leaving the opening chase wave into scatter", () => {
    let clock = startGhostModeClock();
    const tick = tickGhostMode(clock, 20_000);
    expect(tick.forceReverse).toBe(true);
    expect(tick.clock.mode).toBe(GHOST_AI_MODE.scatter);
    clock = tick.clock;

    const midScatter = tickGhostMode(clock, 1_000);
    expect(midScatter.forceReverse).toBe(false);
    expect(midScatter.clock.mode).toBe(GHOST_AI_MODE.scatter);
  });

  it("uses arcade scatter durations after the opening chase", () => {
    let clock = startGhostModeClock();
    clock = tickGhostMode(clock, 20_000).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.scatter);

    clock = tickGhostMode(clock, 7_000).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.chase);

    clock = tickGhostMode(clock, 20_000).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.scatter);

    clock = tickGhostMode(clock, 5_000).clock;
    expect(clock.mode).toBe(GHOST_AI_MODE.chase);
  });

  it("pauses the wave clock while scatter burst is active", () => {
    const clock = startGhostModeClock();
    const paused = resolveGhostModeStep(clock, true, 5_000);
    expect(paused.clock).toEqual(clock);
    expect(paused.mode).toBe(GHOST_AI_MODE.scatter);

    const resumed = resolveGhostModeStep(clock, false, 20_000);
    expect(resumed.clock.waveIndex).toBeGreaterThan(clock.waveIndex);
    expect(resumed.mode).toBe(GHOST_AI_MODE.scatter);
  });

  it("ignores scatter burst while the wave clock is inactive", () => {
    const idle = createGhostModeClock();
    const step = resolveGhostModeStep(idle, true, 5_000);
    expect(step.clock).toEqual(idle);
    expect(step.mode).toBe(GHOST_AI_MODE.chase);
  });
});
