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
    expect(started.mode).toBe(GHOST_AI_MODE.scatter);
  });

  it("forces reverse when leaving the first scatter wave", () => {
    let clock = startGhostModeClock();
    const tick = tickGhostMode(clock, 7_000);
    expect(tick.forceReverse).toBe(true);
    expect(tick.clock.mode).toBe(GHOST_AI_MODE.chase);
    clock = tick.clock;

    const midChase = tickGhostMode(clock, 1_000);
    expect(midChase.forceReverse).toBe(false);
    expect(midChase.clock.mode).toBe(GHOST_AI_MODE.chase);
  });
});
