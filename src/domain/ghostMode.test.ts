import { describe, expect, it } from "vitest";
import {
  createGhostModeClock,
  GHOST_AI_MODE,
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
});
